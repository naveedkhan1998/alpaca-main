from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
import json
import logging
from queue import Queue
import threading
import time
from typing import Any

from django.core.cache import cache
from django.db import close_old_connections
import websocket

from apps.core.services.alpaca_service import AlpacaService
from main.cache_keys import cache_keys
from main.settings.base import APCA_API_KEY, APCA_API_SECRET_KEY

from .aggregator import TimeframeAggregator
from .backfill import BackfillGuard
from .bar_builder import MinuteBarBuilder
from .persistence import CandlePersistence
from .subscriptions import SubscriptionManager
from .utils import is_regular_trading_hours, parse_tick_timestamp

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Switch to INFO in production
websocket.enableTrace(False)


class WebsocketClient:
    """Persistent, high-performance WebSocket client for Alpaca data.

    Responsibilities
    - Maintain a stable WS connection with heartbeats and re-connects
    - Track watchlist symbols and subscribe/unsubscribe as needed
    - Aggregate trade ticks to candles and persist them efficiently
    """

    def __init__(self, sandbox: bool = False):
        self.sandbox = sandbox
        self.ws_stocks: websocket.WebSocketApp | None = None
        self.ws_crypto: websocket.WebSocketApp | None = None

        # State
        self.running = False
        self.authenticated = False
        self.auth_timeout = 30
        self.auth_start_time: float | None = None

        # Buffer for producer/consumer
        self.message_buffer: Queue[dict[str, Any]] = Queue()
        self.bar_builder = MinuteBarBuilder()
        self._prepared_batch: tuple[list[dict], dict] | None = None
        self._replay_buffer: dict[tuple[int, datetime], dict[str, Any]] = {}
        self._socket_authenticated = {"stocks": False, "crypto": False}
        self._socket_auth_started: dict[str, float | None] = {
            "stocks": None,
            "crypto": None,
        }
        self._state_lock = threading.Lock()

        # Persistence + aggregation stack
        self.repo = CandlePersistence()
        self.backfill_guard = BackfillGuard(
            schedule_backfill=self._schedule_backfill_for_asset
        )
        import os as _os

        try:
            _flush_secs = float(_os.getenv("WS_OPEN_FLUSH_SECS", "0.25"))
        except Exception:
            _flush_secs = 0.25
        self.aggregator = TimeframeAggregator(
            repo=self.repo,
            backfill=self.backfill_guard,
            logger=logger,
            open_flush_secs=_flush_secs,
            database_rollup=True,
        )

        # Subscriptions
        self.subscriptions = SubscriptionManager(
            send=self._send_subscription,
            on_assets_added=self._on_assets_added,
        )

        self._connect()

    # Connection bootstrap
    def _get_stocks_url(self) -> str:
        domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        api_key, secret_key = self._get_api_credentials()
        data_domain = (
            "data.sandbox.alpaca.markets" if self.sandbox else "data.alpaca.markets"
        )
        feed = AlpacaService(
            api_key=api_key,
            secret_key=secret_key,
            data_base_url=f"https://{data_domain}",
        ).resolve_stock_feed()
        return f"wss://{domain}/v2/{feed}"

    def _get_crypto_url(self) -> str:
        domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        return f"wss://{domain}/v1beta3/crypto/us"

    def _get_api_credentials(self) -> tuple[str, str]:
        return (APCA_API_KEY, APCA_API_SECRET_KEY)

    def _connect(self):
        self.api_key, self.secret_key = self._get_api_credentials()
        self.ws_stocks = websocket.WebSocketApp(
            self._get_stocks_url(),
            on_open=self.on_open,
            on_message=self.on_message_stocks,
            on_error=self.on_error,
            on_close=self.on_close,
        )
        self.ws_crypto = websocket.WebSocketApp(
            self._get_crypto_url(),
            on_open=self.on_open,
            on_message=self.on_message_crypto,
            on_error=self.on_error,
            on_close=self.on_close,
        )

    # Public entry points
    def run(self):
        self.running = True
        threading.Thread(target=self._subscription_manager_loop, daemon=True).start()
        threading.Thread(target=self._batch_processor_loop, daemon=True).start()
        threading.Thread(target=self._auth_timeout_checker_loop, daemon=True).start()
        threading.Thread(target=self._run_stocks, daemon=True).start()
        threading.Thread(target=self._run_crypto, daemon=True).start()
        # Keep main thread alive
        while self.running:
            time.sleep(1)

    def run_forever(self):
        # Not used anymore, replaced by _run_stocks and _run_crypto
        pass

    def _run_stocks(self):
        while self.running:
            try:
                logger.info("Connecting to Alpaca Stocks WebSocket …")
                assert self.ws_stocks is not None
                self.ws_stocks.run_forever(
                    ping_interval=20,  # seconds
                    ping_timeout=10,
                    ping_payload="keepalive",
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("run_stocks blew up: %s", exc)

            if self.running:
                logger.warning("Stocks socket closed — reconnect in 10 s")
                time.sleep(10)

    def _run_crypto(self):
        while self.running:
            try:
                logger.info("Connecting to Alpaca Crypto WebSocket …")
                assert self.ws_crypto is not None
                self.ws_crypto.run_forever(
                    ping_interval=20,  # seconds
                    ping_timeout=10,
                    ping_payload="keepalive",
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("run_crypto blew up: %s", exc)

            if self.running:
                logger.warning("Crypto socket closed — reconnect in 10 s")
                time.sleep(10)

    def stop(self):
        self.running = False
        if self.ws_stocks:
            self.ws_stocks.close()
        if self.ws_crypto:
            self.ws_crypto.close()

    # WebSocket callbacks
    def on_open(self, ws):
        logger.info("Socket open → authenticating")
        self._authenticate(ws)

    def _authenticate(self, ws):
        with self._state_lock:
            self.auth_start_time = time.time()
            source = "crypto" if ws is self.ws_crypto else "stocks"
            self._socket_auth_started[source] = self.auth_start_time
            self._socket_authenticated[source] = False
        payload = {"action": "auth", "key": self.api_key, "secret": self.secret_key}
        try:
            ws.send(json.dumps(payload))
        except Exception as exc:  # noqa: BLE001
            logger.exception("Auth send failed: %s", exc)
            self.stop()

    def on_message_stocks(self, _ws, raw: str):
        logger.debug("← stocks %s", raw)
        try:
            msgs = json.loads(raw)
            if not isinstance(msgs, list):
                msgs = [msgs]

            for msg in msgs:
                typ = msg.get("T")
                if typ == "error":
                    logger.error("Stocks WS error: %s", msg.get("msg", ""))
                    if "authentication" in msg.get("msg", "").lower():
                        self.stop()
                elif typ == "success":
                    if "authenticated" in msg.get("msg", "").lower():
                        self._mark_authenticated("stocks")
                        logger.info("✅ Stocks Authenticated")
                        # kick a subscription refresh
                        self._restore_subscriptions("stocks")
                elif typ == "subscription":
                    logger.info("Stocks now subscribed: %s", msg)
                elif typ in ("t", "b", "u"):
                    self.message_buffer.put(msg)
                else:
                    logger.debug("Unhandled stocks WS msg: %s", msg)
        except json.JSONDecodeError:
            logger.exception("Bad JSON from stocks: %s", raw)
        except Exception as exc:  # noqa: BLE001
            logger.exception("on_message_stocks fail: %s", exc)

    def on_message_crypto(self, _ws, raw: str):
        logger.debug("← crypto %s", raw)
        try:
            msgs = json.loads(raw)
            if not isinstance(msgs, list):
                msgs = [msgs]

            for msg in msgs:
                typ = msg.get("T")
                if typ == "error":
                    logger.error("Crypto WS error: %s", msg.get("msg", ""))
                    if "authentication" in msg.get("msg", "").lower():
                        self.stop()
                elif typ == "success":
                    if "authenticated" in msg.get("msg", "").lower():
                        self._mark_authenticated("crypto")
                        logger.info("✅ Crypto Authenticated")
                        # kick a subscription refresh
                        self._restore_subscriptions("crypto")
                elif typ == "subscription":
                    logger.info("Crypto now subscribed: %s", msg)
                elif typ in ("t", "b"):  # trade or bar
                    self.message_buffer.put(msg)
                else:
                    logger.debug("Unhandled crypto WS msg: %s", msg)
        except json.JSONDecodeError:
            logger.exception("Bad JSON from crypto: %s", raw)
        except Exception as exc:  # noqa: BLE001
            logger.exception("on_message_crypto fail: %s", exc)

    def on_error(self, _ws, error):
        logger.error("WS error: %s", error)

    def on_close(self, ws=None, *_args):
        with self._state_lock:
            sources = (
                ["stocks", "crypto"]
                if ws is None
                else ["crypto" if ws is self.ws_crypto else "stocks"]
            )
            for source in sources:
                self._socket_authenticated[source] = False
                self._socket_auth_started[source] = None
            self.authenticated = any(self._socket_authenticated.values())
            pending = [t for t in self._socket_auth_started.values() if t is not None]
            self.auth_start_time = min(pending) if pending else None
        logger.warning("Socket closed")

    def _mark_authenticated(self, source: str) -> None:
        with self._state_lock:
            self._socket_authenticated[source] = True
            self._socket_auth_started[source] = None
            self.authenticated = True
            pending = [t for t in self._socket_auth_started.values() if t is not None]
            self.auth_start_time = min(pending) if pending else None

    def _restore_subscriptions(self, source: str) -> None:
        # Reconnects do not change the desired set, but the server lost it.
        with self.subscriptions._sub_lock:
            symbols = list(self.subscriptions.subscribed_symbols)
        with self.subscriptions._asset_lock:
            symbols = [
                symbol
                for symbol in symbols
                if (
                    self.subscriptions.asset_class_cache.get(
                        self.subscriptions.asset_cache.get(symbol)
                    )
                    == "crypto"
                )
                == (source == "crypto")
            ]
        if source == "crypto":
            self._send_subscription_crypto("subscribe", symbols)
        else:
            self._send_subscription_stocks("subscribe", symbols)

    # Subscriptions
    def _subscription_manager_loop(self):
        logger.debug("subscription_manager started")
        while self.running:
            close_old_connections()
            if self.authenticated:
                self._update_subscriptions()
            if not self.running:
                break
            time.sleep(5)
        logger.debug("subscription_manager stopped")

    def _send_subscription(self, action: str, symbols: list[str]) -> None:
        if not symbols:
            return
        # Group symbols by asset class
        stocks_symbols = []
        crypto_symbols = []
        with self.subscriptions._asset_lock:
            for sym in symbols:
                aid = self.subscriptions.asset_cache.get(sym)
                if aid:
                    asset_class = self.subscriptions.asset_class_cache.get(aid)
                    if asset_class == "crypto":
                        crypto_symbols.append(sym)
                    else:
                        stocks_symbols.append(sym)
        # Send to each
        self._send_subscription_stocks(action, stocks_symbols)
        self._send_subscription_crypto(action, crypto_symbols)

    def _send_subscription_stocks(self, action: str, symbols: list[str]) -> None:
        if not (
            self._socket_authenticated["stocks"]
            and self._sock_ready_stocks()
            and symbols
        ):
            return
        try:
            assert self.ws_stocks is not None
            payload = {
                "action": action,
                "trades": symbols,
                "bars": symbols,
                "updatedBars": symbols,
            }
            self.ws_stocks.send(json.dumps(payload))
            logger.info("→ stocks %s %s", action, symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("%s stocks failed: %s", action, exc)
            raise

    def _send_subscription_crypto(self, action: str, symbols: list[str]) -> None:
        if not (
            self._socket_authenticated["crypto"]
            and self._sock_ready_crypto()
            and symbols
        ):
            return
        try:
            assert self.ws_crypto is not None
            payload = {"action": action, "trades": symbols, "bars": symbols}
            self.ws_crypto.send(json.dumps(payload))
            logger.info("→ crypto %s %s", action, symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("%s crypto failed: %s", action, exc)
            raise

    def _on_assets_added(self, symbols: set[str]) -> None:
        # Convert to asset ids and schedule backfill if stale
        try:
            with self.subscriptions._asset_lock:
                asset_ids = [
                    self.subscriptions.asset_cache[s]
                    for s in symbols
                    if s in self.subscriptions.asset_cache
                ]
            # Schedule backfill where needed; only reset accumulators for those actually scheduled
            scheduled = self.backfill_guard.maybe_schedule_for_assets(asset_ids)
            for aid in scheduled:
                self.aggregator.reset_for_asset(aid)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed during on_assets_added: %s", exc)

    def _update_subscriptions(self):
        try:
            self.subscriptions.reconcile()
        except Exception as exc:  # noqa: BLE001
            logger.exception("Subscription reconcile failed: %s", exc)

    def _sock_ready_stocks(self) -> bool:
        return bool(
            self.ws_stocks and self.ws_stocks.sock and self.ws_stocks.sock.connected
        )

    def _sock_ready_crypto(self) -> bool:
        return bool(
            self.ws_crypto and self.ws_crypto.sock and self.ws_crypto.sock.connected
        )

    # Batch processing
    def _batch_processor_loop(self):
        logger.debug("batch_processor started")
        while self.running:
            close_old_connections()
            if self._prepared_batch is not None:
                try:
                    self._process_batch(self._prepared_batch[0])
                except Exception:
                    logger.exception("Failed to retry prepared market data")
                    time.sleep(1)
                continue
            if self.message_buffer.empty():
                try:
                    self._process_batch([])
                except Exception:
                    logger.exception("Failed to flush pending market data")
                time.sleep(1)
                continue
            messages: list[dict] = []
            start_ns = time.time_ns()
            MAX_MSGS = 2000
            # Tunable batch budget (ms) to reduce latency; default 150ms
            try:
                _batch_ms = float(__import__("os").getenv("WS_BATCH_MS", "150"))
            except Exception:
                _batch_ms = 150.0
            MAX_NS = int(_batch_ms * 1_000_000)
            while not self.message_buffer.empty() and len(messages) < MAX_MSGS:
                messages.append(self.message_buffer.get())
                if time.time_ns() - start_ns > MAX_NS:
                    break
            logger.debug("Processing %d messages", len(messages))

            # Retry loop to ensure data consistency
            processed = False
            while not processed and self.running:
                try:
                    self._process_batch(messages)
                    processed = True
                except Exception as exc:  # noqa: BLE001
                    logger.warning(f"Batch processing failed: {exc}. Retrying in 1s...")
                    close_old_connections()
                    time.sleep(1)
        logger.debug("batch_processor stopped")

    def _process_batch(self, messages: list[dict]):
        """Prepare once, then retry idempotent snapshots without replaying trades."""
        if self._prepared_batch is None:
            with self.subscriptions._asset_lock:
                sym_to_id = self.subscriptions.asset_cache.copy()
                id_to_class = self.subscriptions.asset_class_cache.copy()
            minutes = {}
            for msg in messages:
                aid = sym_to_id.get(msg.get("S"))
                if aid is None:
                    continue
                try:
                    if not isinstance(msg.get("t"), str):
                        raise ValueError("Market-data timestamp must be a string")
                    ts = parse_tick_timestamp(msg["t"], minute_precision=False)
                    crypto = id_to_class.get(aid) == "crypto"
                    if not crypto and not is_regular_trading_hours(ts):
                        continue
                    minute = ts.replace(second=0, microsecond=0)
                    if msg.get("T") == "t":
                        candle = self.bar_builder.ingest(aid, ts, msg, crypto=crypto)
                        if candle:
                            minutes[(aid, minute)] = candle
                    elif msg.get("T") in {"b", "u"}:
                        candle = {
                            name: Decimal(str(msg[field]))
                            for name, field in (
                                ("open", "o"),
                                ("high", "h"),
                                ("low", "l"),
                                ("close", "c"),
                                ("volume", "v"),
                            )
                        }
                        if any(not value.is_finite() for value in candle.values()):
                            raise ValueError("Market-data fields must be finite")
                        candle["trade_count"] = msg.get("n")
                        candle["vwap"] = msg.get("vw")
                        candle["_authoritative"] = True
                        minutes[(aid, minute)] = candle
                        self.bar_builder.mark_authoritative(aid, minute)
                except ValueError, TypeError, KeyError, InvalidOperation:
                    logger.exception(
                        "Rejected malformed market data for asset_id=%s", aid
                    )
            self._prepared_batch = (messages, minutes)
        elif self._prepared_batch[0] is not messages:
            raise RuntimeError(
                "A failed market-data batch must be retried before processing new messages"
            )

        minutes = {**self._replay_buffer, **self._prepared_batch[1]}
        asset_ids = {aid for aid, _ts in minutes}
        keys = {
            aid: (cache_keys.backfill(aid).running(), cache_keys.backfill(aid).queued())
            for aid in asset_ids
        }
        flags = (
            cache.get_many([key for pair in keys.values() for key in pair])
            if keys
            else {}
        )
        ready = {}
        for key, candle in minutes.items():
            aid, _ts = key
            if any(flags.get(flag) for flag in keys[aid]):
                # Do not replace REST history with a partial observed-trade ledger
                # when replaying after a backfill.
                if candle.get("_authoritative"):
                    self._replay_buffer[key] = candle
            else:
                ready[key] = candle
        if ready:
            self.repo.upsert_minutes(
                [
                    {"asset_id": aid, "timestamp": ts, **data}
                    for (aid, ts), data in ready.items()
                ],
                mode="snapshot",
            )
            self.aggregator.rollup_from_minutes(ready)
        latest_ts = max((ts for _aid, ts in minutes), default=None)
        if latest_ts is None and any(self.aggregator._tf_acc.values()):
            latest_ts = datetime.now(UTC).replace(second=0, microsecond=0)
        if latest_ts:
            # Include previously throttled buckets, even when no further ticks arrive.
            touched = {tf: set(acc) for tf, acc in self.aggregator._tf_acc.items()}
            self.aggregator.persist_open(touched, latest_ts)
            self.aggregator.flush_closed(latest_ts)
        for key in ready:
            self._replay_buffer.pop(key, None)
        if latest_ts:
            cutoff = latest_ts - timedelta(minutes=5)
            self._replay_buffer = {
                key: data
                for key, data in self._replay_buffer.items()
                if key[1] >= cutoff
            }
        self._prepared_batch = None

    # Backfill scheduling helper used by BackfillGuard
    def _schedule_backfill_for_asset(self, asset_id: int) -> None:
        # No longer used directly; BackfillGuard invokes coordinator instead.
        # Kept for compatibility if needed in the future.
        from apps.core.services.backfill_coordinator import request_backfill

        try:
            request_backfill(asset_id, source="websocket-service")
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to schedule backfill for %s: %s", asset_id, exc)

    # Auth timeout watchdog
    def _auth_timeout_checker_loop(self):
        logger.debug("auth_timeout_checker started")
        while self.running:
            close_old_connections()
            with self._state_lock:
                timed_out = [
                    source
                    for source, started in self._socket_auth_started.items()
                    if started is not None
                    and time.time() - started > self.auth_timeout
                    and not self._socket_authenticated[source]
                ]
                for source in timed_out:
                    self._socket_auth_started[source] = None
            for source in timed_out:
                logger.error("Auth timeout for %s — restart socket", source)
                ws = self.ws_crypto if source == "crypto" else self.ws_stocks
                if ws:
                    ws.close()
            time.sleep(5)
        logger.debug("auth_timeout_checker stopped")
