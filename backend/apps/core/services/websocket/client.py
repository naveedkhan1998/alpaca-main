from __future__ import annotations

from datetime import datetime, timedelta
import json
import logging
from queue import Queue
import threading
import time

import pytz
import websocket

from apps.core.models import AlpacaAccount

from .aggregator import CandleAggregator
from .connection import AlpacaWSConnection
from .repository import MarketRepository
from .subscription import SubscriptionManager

logger = logging.getLogger(__name__)


class WebsocketClient:
    """Main orchestrator for Alpaca WebSocket service."""

    def __init__(self, account_id: int, sandbox: bool = False) -> None:
        self.account_id = account_id
        self.sandbox = sandbox
        self.running = False
        self.authenticated = False
        self.auth_start_time: float | None = None
        self.auth_timeout = 30.0

        # Shared state
        self.asset_cache: dict[str, int] = {}
        self.asset_class_cache: dict[int, str] = {}
        self.asset_lock = threading.Lock()
        self.subscribed_symbols: set[str] = set()
        self.sub_lock = threading.Lock()
        self.tick_buffer: Queue[dict] = Queue()

        # Repository
        self.repo = MarketRepository()

        # Subscription Manager
        self.sub_manager = SubscriptionManager(
            self.repo, self.asset_cache, self.asset_class_cache, self.asset_lock
        )

        # Aggregator
        tf_cfg = {
            "1T": timedelta(minutes=1),
            "5T": timedelta(minutes=5),
            "15T": timedelta(minutes=15),
            "30T": timedelta(minutes=30),
            "1H": timedelta(hours=1),
            "4H": timedelta(hours=4),
            "1D": timedelta(days=1),
        }
        tf_acc = {tf: {} for tf in tf_cfg if tf != "1T"}
        last_open_flush = dict.fromkeys(tf_acc, 0.0)
        self.aggregator = CandleAggregator(
            self.repo, tf_cfg, tf_acc, last_open_flush, 2.0
        )

        # WebSocket Connection
        api_key, secret_key = self._get_api_credentials()
        ws_url = self._get_ws_url()
        self.connection = AlpacaWSConnection(
            ws_url,
            api_key,
            secret_key,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close,
        )

    # ---------------- Connection Helpers ----------------

    def _get_api_credentials(self) -> tuple[str, str]:
        acct = AlpacaAccount.objects.get(id=self.account_id)
        return acct.api_key, acct.api_secret

    def _get_ws_url(self) -> str:
        domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        return f"wss://{domain}/v2/iex"

    # ---------------- Public API ----------------

    def run(self) -> None:
        self.running = True
        threading.Thread(target=self._subscription_loop, daemon=True).start()
        threading.Thread(target=self._batch_loop, daemon=True).start()
        threading.Thread(target=self._auth_timeout_loop, daemon=True).start()
        self.connection.connect()
        self.connection.run_forever()

    def stop(self) -> None:
        self.running = False
        if self.connection.ws_app:
            self.connection.ws_app.close()

    # ---------------- Loops ----------------

    def _subscription_loop(self) -> None:
        while self.running:
            if self.authenticated:
                new, gone = self.sub_manager.diff_subscriptions(self.subscribed_symbols)
                if new:
                    self._send_subscribe(list(new))
                    self.sub_manager.update_asset_cache(new)
                    self.subscribed_symbols |= new
                if gone:
                    self._send_unsubscribe(list(gone))
                    self.subscribed_symbols -= gone
            time.sleep(5)

    def _batch_loop(self) -> None:
        while self.running:
            ticks = self._drain_ticks()
            if ticks:
                m1_map, latest = self.aggregator.aggregate_to_1T(
                    ticks, self.asset_cache, self.asset_class_cache, self._is_rth
                )
                if m1_map and latest:
                    self.aggregator.persist_1T(m1_map)
                    touched = self.aggregator.rollup_higher_timeframes(m1_map)
                    self.aggregator.persist_open_buckets(touched, latest)
                    self.aggregator.flush_closed_buckets(latest)
            time.sleep(0.5)

    def _auth_timeout_loop(self) -> None:
        while self.running:
            if (
                self.auth_start_time
                and not self.authenticated
                and time.time() - self.auth_start_time > self.auth_timeout
            ):
                logger.error("Auth timeout — restarting socket")
                self.auth_start_time = None
                if self.connection.ws_app:
                    self.connection.ws_app.close()
            time.sleep(5)

    # ---------------- WebSocket Callbacks ----------------

    def _on_open(self, ws: websocket.WebSocketApp) -> None:
        logger.info("Socket open → authenticating")
        self.auth_start_time = time.time()
        payload = json.dumps(
            {
                "action": "auth",
                "key": self.connection.api_key,
                "secret": self.connection.secret_key,
            }
        )
        ws.send(payload)

    def _on_message(self, _ws: websocket.WebSocketApp, raw: str) -> None:
        try:
            msgs = json.loads(raw)
            if not isinstance(msgs, list):
                msgs = [msgs]
            for msg in msgs:
                t = msg.get("T")
                if t == "success" and "authenticated" in msg.get("msg", "").lower():
                    self.authenticated = True
                    logger.info("✅ Authenticated")
                elif t == "t":
                    self.tick_buffer.put(msg)
                elif t == "error":
                    logger.error("WS error: %s", msg.get("msg"))
        except Exception as e:
            logger.exception("on_message error: %s", e)

    def _on_error(self, _ws: websocket.WebSocketApp, error: Exception) -> None:
        logger.error("WS error: %s", error)

    def _on_close(
        self,
        _ws: websocket.WebSocketApp,
        close_status_code: int | None,
        close_msg: str | None,
    ) -> None:
        self.authenticated = False
        logger.warning("Socket closed: %s %s", close_status_code, close_msg)

    # ---------------- Subscription Send ----------------

    def _send_subscribe(self, symbols: list[str]) -> None:
        if (
            self.connection.ws_app
            and self.connection.ws_app.sock
            and self.connection.ws_app.sock.connected
        ):
            payload = json.dumps({"action": "subscribe", "trades": symbols})
            self.connection.ws_app.send(payload)

    def _send_unsubscribe(self, symbols: list[str]) -> None:
        if (
            self.connection.ws_app
            and self.connection.ws_app.sock
            and self.connection.ws_app.sock.connected
        ):
            payload = json.dumps({"action": "unsubscribe", "trades": symbols})
            self.connection.ws_app.send(payload)

    # ---------------- Utilities ----------------

    def _drain_ticks(self) -> list[dict]:
        ticks: list[dict] = []
        while not self.tick_buffer.empty() and len(ticks) < 2000:
            ticks.append(self.tick_buffer.get())
        return ticks

    def _is_rth(self, ts_utc: datetime) -> bool:
        """Return True if timestamp is within regular US equity hours."""
        try:
            ny = pytz.timezone("America/New_York")
            ts_local = ts_utc.astimezone(ny)
            if ts_local.weekday() > 4:
                return False
            start = ts_local.replace(
                hour=9, minute=30, second=0, microsecond=0
            ).timetz()
            end = ts_local.replace(hour=16, minute=0, second=0, microsecond=0).timetz()
            return start <= ts_local.timetz() < end
        except Exception:
            return True
