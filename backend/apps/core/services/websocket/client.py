from __future__ import annotations

from collections import defaultdict
from datetime import datetime
import json
import logging
from queue import Queue
import threading
import time
from typing import Any

from django.db import close_old_connections
import websocket

from main import const
from main.settings.base import APCA_API_KEY, APCA_API_SECRET_KEY

from .aggregator import TimeframeAggregator
from .backfill import BackfillGuard
from .persistence import CandleRepository
from .subscriptions import SubscriptionManager
from .utils import floor_to_bucket, is_regular_trading_hours, parse_tick_timestamp

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

        # Persistence + aggregation stack
        self.repo = CandleRepository()
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
        return f"wss://{domain}/v2/iex"

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
        self.auth_start_time = time.time()
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
                        self.authenticated = True
                        logger.info("✅ Stocks Authenticated")
                        # kick a subscription refresh
                        self._update_subscriptions()
                elif typ == "subscription":
                    logger.info("Stocks now subscribed: %s", msg)
                elif typ == "t":  # trade tick
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
                        self.authenticated = True
                        logger.info("✅ Crypto Authenticated")
                        # kick a subscription refresh
                        self._update_subscriptions()
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

    def on_close(self, *_args):
        self.authenticated = False
        self.auth_start_time = None
        logger.warning("Socket closed")

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
        if not (self.authenticated and self._sock_ready_stocks() and symbols):
            return
        try:
            assert self.ws_stocks is not None
            payload = {"action": action, "trades": symbols}
            self.ws_stocks.send(json.dumps(payload))
            logger.info("→ stocks %s %s", action, symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("%s stocks failed: %s", action, exc)

    def _send_subscription_crypto(self, action: str, symbols: list[str]) -> None:
        if not (self.authenticated and self._sock_ready_crypto() and symbols):
            return
        try:
            assert self.ws_crypto is not None
            payload = {"action": action, "trades": symbols, "bars": symbols}
            self.ws_crypto.send(json.dumps(payload))
            logger.info("→ crypto %s %s", action, symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("%s crypto failed: %s", action, exc)

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
            if self.message_buffer.empty():
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
            self._process_batch(messages)
        logger.debug("batch_processor stopped")

    def _process_batch(self, messages: list[dict]):
        # Separate trades and bars
        trades = [m for m in messages if m.get("T") == "t"]
        bars = [m for m in messages if m.get("T") == "b"]

        # Snapshot caches for this batch
        with self.subscriptions._asset_lock:
            sym_to_id = self.subscriptions.asset_cache.copy()
            id_to_class = self.subscriptions.asset_class_cache.copy()

        # Process bars directly as 1T candles
        bar_candles: dict[tuple[int, datetime], dict[str, Any]] = {}
        if bars:
            for b in bars:
                sym = b.get("S")
                aid = sym_to_id.get(sym)
                if aid is None:
                    continue
                ts_str = b.get("t")
                if ts_str is None:
                    continue
                ts = parse_tick_timestamp(ts_str)
                # For crypto, no trading hours filter
                asset_class = id_to_class.get(aid)
                if asset_class == "crypto":
                    # No filter
                    pass
                elif asset_class in {
                    "us_equity",
                    "us_option",
                } and not is_regular_trading_hours(ts):
                    continue

                key = (aid, ts)
                bar_candles[key] = {
                    "open": b.get("o"),
                    "high": b.get("h"),
                    "low": b.get("l"),
                    "close": b.get("c"),
                    "volume": b.get("v", 0),
                }
            self.repo.save_candles(const.TF_1T, bar_candles, logger=logger)

        # Aggregate trades into 1T bars from trades
        m1_map: dict[tuple[int, datetime], dict[str, Any]] = defaultdict(
            lambda: {
                "open": None,
                "high": -float("inf"),
                "low": float("inf"),
                "close": None,
                "volume": 0,
            }
        )

        latest_ts: datetime | None = None
        for t in trades:
            sym = t.get("S")
            aid = sym_to_id.get(sym)
            if aid is None:
                continue
            price = t.get("p")
            vol = t.get("s", 0)
            ts_str = t.get("t")
            if price is None or ts_str is None:
                continue
            ts = parse_tick_timestamp(ts_str)
            # Filter out after-hours ticks for non-24/7 asset classes
            asset_class = id_to_class.get(aid)
            if asset_class in {
                "us_equity",
                "us_option",
            } and not is_regular_trading_hours(ts):
                continue

            key = (aid, ts)
            c = m1_map[key]
            if c["open"] is None:
                c["open"] = c["close"] = price
            c["high"] = max(c["high"], price)
            c["low"] = min(c["low"], price)
            c["close"] = price
            c["volume"] += vol
            latest_ts = max(latest_ts, ts) if latest_ts else ts

        # Persist 1T from trades
        self.repo.save_candles(const.TF_1T, m1_map, logger=logger)

        # Combine latest_ts from bars and trades
        if bars:
            for b in bars:
                ts_str = b.get("t")
                if ts_str:
                    ts = parse_tick_timestamp(ts_str)
                    latest_ts = max(latest_ts, ts) if latest_ts else ts

        # Map minute keys back to PKs for linkage
        all_m1_keys = list(m1_map.keys()) + list(bar_candles.keys())
        minute_ids_by_key = self.repo.fetch_minute_ids(all_m1_keys)

        # Merge bar-based minutes into trade-based minutes for rollup authority
        # Prefer bar values when present as authoritative 1T OHLCV
        if bar_candles:
            for k, v in bar_candles.items():
                m1_map[k] = v

        # Update higher timeframes and attach minute IDs
        if latest_ts:
            touched_by_tf = self.aggregator.rollup_from_minutes(m1_map)
            # Persist open buckets immediately for lower latency updates
            self.aggregator.persist_open(touched_by_tf, latest_ts)
            # Attach minute ids to accumulators
            from main import const as _const

            for tf, delta in _const.TF_CFG.items():
                if tf == _const.TF_1T:
                    continue
                acc = self.aggregator._tf_acc[tf]
                for (aid, m1_ts), _ in m1_map.items():
                    # derive bucket from incoming minute timestamps
                    bucket = floor_to_bucket(m1_ts, delta)
                    key = (aid, bucket)
                    acc.setdefault(key, {})
                    ids_list = acc[key].setdefault("minute_candle_ids", [])
                    mid = minute_ids_by_key.get((aid, m1_ts))
                    if mid is not None and mid not in ids_list:
                        ids_list.append(mid)
                # Also for bars
                for (aid, m1_ts), _ in bar_candles.items():
                    bucket = floor_to_bucket(m1_ts, delta)
                    key = (aid, bucket)
                    acc.setdefault(key, {})
                    ids_list = acc[key].setdefault("minute_candle_ids", [])
                    mid = minute_ids_by_key.get((aid, m1_ts))
                    if mid is not None and mid not in ids_list:
                        ids_list.append(mid)
            # Persist open buckets again (may be throttled) and flush closed
            self.aggregator.persist_open(touched_by_tf, latest_ts)
            self.aggregator.flush_closed(latest_ts)

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
            if (
                self.auth_start_time
                and not self.authenticated
                and time.time() - self.auth_start_time > self.auth_timeout
            ):
                logger.error("Auth timeout — restart sockets")
                self.auth_start_time = None
                if self.ws_stocks:
                    self.ws_stocks.close()
                if self.ws_crypto:
                    self.ws_crypto.close()
            time.sleep(5)
        logger.debug("auth_timeout_checker stopped")
