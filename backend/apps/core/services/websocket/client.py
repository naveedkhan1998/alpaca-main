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
        self.ws_app: websocket.WebSocketApp | None = None

        # State
        self.running = False
        self.authenticated = False
        self.auth_timeout = 30
        self.auth_start_time: float | None = None

        # Buffer for producer/consumer
        self.tick_buffer: Queue[dict[str, Any]] = Queue()

        # Persistence + aggregation stack
        self.repo = CandleRepository()
        self.backfill_guard = BackfillGuard(
            schedule_backfill=self._schedule_backfill_for_asset
        )
        self.aggregator = TimeframeAggregator(
            repo=self.repo, backfill=self.backfill_guard, logger=logger
        )

        # Subscriptions
        self.subscriptions = SubscriptionManager(
            send=self._send_subscription,
            on_assets_added=self._on_assets_added,
        )

        self._connect()

    # Connection bootstrap
    def _get_ws_url(self) -> str:
        domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        return f"wss://{domain}/v2/iex"

    def _get_api_credentials(self) -> tuple[str, str]:
        return (APCA_API_KEY, APCA_API_SECRET_KEY)

    def _connect(self):
        self.api_key, self.secret_key = self._get_api_credentials()
        self.ws_app = websocket.WebSocketApp(
            self._get_ws_url(),
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )

    # Public entry points
    def run(self):
        self.running = True
        threading.Thread(target=self._subscription_manager_loop, daemon=True).start()
        threading.Thread(target=self._batch_processor_loop, daemon=True).start()
        threading.Thread(target=self._auth_timeout_checker_loop, daemon=True).start()
        self.run_forever()  # blocks

    def run_forever(self):
        while self.running:
            try:
                logger.info("Connecting to Alpaca WebSocket …")
                assert self.ws_app is not None
                self.ws_app.run_forever(
                    ping_interval=20,  # seconds
                    ping_timeout=10,
                    ping_payload="keepalive",
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("run_forever blew up: %s", exc)

            if self.running:
                logger.warning("Socket closed — reconnect in 10 s")
                time.sleep(10)

    def stop(self):
        self.running = False
        if self.ws_app:
            self.ws_app.close()

    # WebSocket callbacks
    def on_open(self, _ws):
        logger.info("Socket open → authenticating")
        self._authenticate()

    def _authenticate(self):
        self.auth_start_time = time.time()
        payload = {"action": "auth", "key": self.api_key, "secret": self.secret_key}
        try:
            assert self.ws_app is not None
            self.ws_app.send(json.dumps(payload))
        except Exception as exc:  # noqa: BLE001
            logger.exception("Auth send failed: %s", exc)
            self.stop()

    def on_message(self, _ws, raw: str):
        logger.debug("← %s", raw)
        try:
            msgs = json.loads(raw)
            if not isinstance(msgs, list):
                msgs = [msgs]

            for msg in msgs:
                typ = msg.get("T")
                if typ == "error":
                    logger.error("WS error: %s", msg.get("msg", ""))
                    if "authentication" in msg.get("msg", "").lower():
                        self.stop()
                elif typ == "success":
                    if "authenticated" in msg.get("msg", "").lower():
                        self.authenticated = True
                        logger.info("✅ Authenticated")
                        # kick a subscription refresh
                        self._update_subscriptions()
                elif typ == "subscription":
                    logger.info("Now subscribed: %s", msg)
                elif typ == "t":  # trade tick
                    self.tick_buffer.put(msg)
                else:
                    logger.debug("Unhandled WS msg: %s", msg)
        except json.JSONDecodeError:
            logger.exception("Bad JSON: %s", raw)
        except Exception as exc:  # noqa: BLE001
            logger.exception("on_message fail: %s", exc)

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
        if not (self.authenticated and self._sock_ready() and symbols):
            return
        try:
            assert self.ws_app is not None
            payload = {"action": action, "trades": symbols}
            self.ws_app.send(json.dumps(payload))
            logger.info("→ %s %s", action, symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("%s failed: %s", action, exc)

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

    def _sock_ready(self) -> bool:
        return bool(self.ws_app and self.ws_app.sock and self.ws_app.sock.connected)

    # Batch processing
    def _batch_processor_loop(self):
        logger.debug("batch_processor started")
        while self.running:
            close_old_connections()
            if self.tick_buffer.empty():
                time.sleep(1)
                continue
            ticks: list[dict] = []
            start_ns = time.time_ns()
            MAX_TICKS = 2000
            MAX_NS = 250_000_000  # ~250ms budget
            while not self.tick_buffer.empty() and len(ticks) < MAX_TICKS:
                ticks.append(self.tick_buffer.get())
                if time.time_ns() - start_ns > MAX_NS:
                    break
            logger.debug("Processing %d ticks", len(ticks))
            self._process_batch(ticks)
        logger.debug("batch_processor stopped")

    def _process_batch(self, ticks: list[dict]):
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

        # Snapshot caches for this batch
        with self.subscriptions._asset_lock:
            sym_to_id = self.subscriptions.asset_cache.copy()
            id_to_class = self.subscriptions.asset_class_cache.copy()

        latest_ts: datetime | None = None
        for t in ticks:
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

        # Persist 1T immediately
        self.repo.save_candles(const.TF_1T, m1_map, logger=logger)

        # Map minute keys back to PKs for linkage
        minute_ids_by_key = self.repo.fetch_minute_ids(list(m1_map.keys()))

        # Update higher timeframes and attach minute IDs
        if latest_ts:
            touched_by_tf = self.aggregator.rollup_from_minutes(m1_map)
            # Attach minute ids to accumulators
            from main import const as _const

            for tf, delta in _const.TF_CFG.items():
                if tf == _const.TF_1T:
                    continue
                acc = self.aggregator._tf_acc[tf]
                for (aid, m1_ts), _ in m1_map.items():
                    # derive bucket from incoming minute timestamps
                    from .utils import floor_to_bucket as _floor

                    bucket = _floor(m1_ts, delta)
                    key = (aid, bucket)
                    acc.setdefault(key, {})
                    ids_list = acc[key].setdefault("minute_candle_ids", [])
                    mid = minute_ids_by_key.get((aid, m1_ts))
                    if mid is not None and mid not in ids_list:
                        ids_list.append(mid)
            # Persist open buckets and flush closed
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
                logger.error("Auth timeout — restart socket")
                self.auth_start_time = None
                if self.ws_app:
                    self.ws_app.close()
            time.sleep(5)
        logger.debug("auth_timeout_checker stopped")
