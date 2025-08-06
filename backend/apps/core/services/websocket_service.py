"""
websocket_service.py
====================
A resilient, threaded WebSocket client for Alpaca market data.

Changes (2025-08-04):
• Heartbeat (ping/pong) + auto-reconnect via websocket-client
• queue.Queue for thread-safe tick buffering
• close_old_connections() keeps Django DB handles fresh
• DEBUG log level by default for liveness signals
• Separate locks to reduce contention
"""

import json
import logging
import threading
import time
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any
from queue import Queue

import websocket
from django.db import transaction, close_old_connections
from django.utils import timezone

from apps.core.models import AlpacaAccount, Asset, Candle, WatchListAsset

# --------------------------------------------------------------------------- #
# Logging                                                                     #
# --------------------------------------------------------------------------- #
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # ⚠️ switch to INFO in production
websocket.enableTrace(False)  # flip to True if you need wire logs


class WebsocketClient:
    """Persistent, high-performance WebSocket client for Alpaca data."""

    # --------------------------------------------------------------------- #
    # Construction / connection                                             #
    # --------------------------------------------------------------------- #
    def __init__(self, account_id: int, sandbox: bool = False):
        self.account_id = account_id
        self.sandbox = sandbox
        self.ws_app = None

        # State
        self.subscribed_symbols: set[str] = set()
        self.running = False
        self.authenticated = False
        self.auth_timeout = 30
        self.auth_start_time: float | None = None

        # Concurrency primitives
        self.asset_cache: Dict[str, int] = {}
        self.asset_lock = threading.Lock()  # protects asset_cache
        self.sub_lock = threading.Lock()  # protects subscribed_symbols
        self.tick_buffer: Queue[dict] = Queue()  # producer/consumer buffer

        self._connect()

    def _get_ws_url(self) -> str:
        domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        return f"wss://{domain}/v2/iex"

    def _get_api_credentials(self) -> tuple[str, str]:
        try:
            acct = AlpacaAccount.objects.get(id=self.account_id)
            return acct.api_key, acct.api_secret
        except AlpacaAccount.DoesNotExist:
            logger.error("AlpacaAccount id=%s not found", self.account_id)
            raise

    def _connect(self):
        self.api_key, self.secret_key = self._get_api_credentials()
        self.ws_app = websocket.WebSocketApp(
            self._get_ws_url(),
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )

    # --------------------------------------------------------------------- #
    # Public entry points                                                   #
    # --------------------------------------------------------------------- #
    def run(self):
        """Start background threads + main socket loop."""
        self.running = True
        threading.Thread(target=self.subscription_manager, daemon=True).start()
        threading.Thread(target=self.batch_processor, daemon=True).start()
        threading.Thread(target=self.auth_timeout_checker, daemon=True).start()
        self.run_forever()  # blocks

    def run_forever(self):
        """Socket loop with built-in heartbeat and reconnect."""
        while self.running:
            try:
                logger.info("Connecting to Alpaca WebSocket …")
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

    # --------------------------------------------------------------------- #
    # WebSocket callbacks                                                   #
    # --------------------------------------------------------------------- #
    def on_open(self, _ws):
        logger.info("Socket open → authenticating")
        self.authenticate()

    def authenticate(self):
        self.auth_start_time = time.time()
        payload = {"action": "auth", "key": self.api_key, "secret": self.secret_key}
        try:
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
                match msg.get("T"):
                    case "error":
                        logger.error("WS error: %s", msg.get("msg", ""))
                        if "authentication" in msg.get("msg", "").lower():
                            self.stop()
                    case "success":
                        if "authenticated" in msg.get("msg", "").lower():
                            self.authenticated = True
                            logger.info("✅ Authenticated")
                            self.update_subscriptions()
                    case "subscription":
                        logger.info("Now subscribed: %s", msg)
                    case "t":  # trade tick
                        self.tick_buffer.put(msg)
                    case _:
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

    # --------------------------------------------------------------------- #
    # Subscription management                                               #
    # --------------------------------------------------------------------- #
    def get_watchlist_symbols(self) -> set[str]:
        symbols = set(
            WatchListAsset.objects.filter(
                watchlist__is_active=True, is_active=True
            ).values_list("asset__symbol", flat=True)
        )
        return symbols

    def update_asset_cache(self, symbols: set[str]):
        assets = Asset.objects.filter(symbol__in=symbols).values("symbol", "id")
        with self.asset_lock:
            new_mappings = {a["symbol"]: a["id"] for a in assets}
            self.asset_cache.update(new_mappings)
            logger.debug("Updated asset cache with %d symbols: %s", len(new_mappings), new_mappings)
            
        # When adding new assets, trigger historical data fetch for any gaps
        for symbol in symbols:
            if symbol in new_mappings:
                asset_id = new_mappings[symbol]
                # Check if we have recent data for this asset
                latest_candle = Candle.objects.filter(
                    asset_id=asset_id, 
                    timeframe="1Min"
                ).order_by("-timestamp").first()
                
                if latest_candle:
                    time_diff = timezone.now() - latest_candle.timestamp
                    # If latest candle is more than 2 minutes old, log it
                    if time_diff.total_seconds() > 120:
                        logger.warning(
                            f"Asset {symbol} latest candle is {time_diff} old. "
                            f"Historical fetch may be needed to fill gap."
                        )

    def subscription_manager(self):
        logger.debug("subscription_manager started")
        while self.running:
            close_old_connections()

            if self.authenticated:
                self.update_subscriptions()

            for _ in range(12):  # 60 s total
                if not self.running:
                    break
                time.sleep(5)

        logger.debug("subscription_manager stopped")

    def update_subscriptions(self):
        if not self.authenticated:
            return

        current = self.get_watchlist_symbols()

        with self.sub_lock:
            new = current - self.subscribed_symbols
            gone = self.subscribed_symbols - current

            # Debug logging to understand subscription changes
            if new or gone:
                logger.debug("Subscription update: current=%s, subscribed=%s, new=%s, gone=%s", 
                           current, self.subscribed_symbols, new, gone)

            # Only process changes if there are actual differences
            if new:
                self.subscribe(list(new))
                self.subscribed_symbols.update(new)
                self.update_asset_cache(new)

            if gone:
                self.unsubscribe(list(gone))
                self.subscribed_symbols.difference_update(gone)
                with self.asset_lock:
                    for sym in gone:
                        self.asset_cache.pop(sym, None)

            # Removed the fallback subscription - if no watchlist symbols, stay unsubscribed

    def subscribe(self, symbols: list[str]):
        if not (self.authenticated and self._sock_ready()):
            return
        try:
            self.ws_app.send(json.dumps({"action": "subscribe", "trades": symbols}))
            logger.info("→ subscribe %s", symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("subscribe failed: %s", exc)

    def unsubscribe(self, symbols: list[str]):
        if not (self.authenticated and self._sock_ready()):
            return
        try:
            self.ws_app.send(json.dumps({"action": "unsubscribe", "trades": symbols}))
            logger.info("→ unsubscribe %s", symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("unsubscribe failed: %s", exc)

    def _sock_ready(self) -> bool:
        return self.ws_app and self.ws_app.sock and self.ws_app.sock.connected

    # --------------------------------------------------------------------- #
    # Tick batching + candle writes                                         #
    # --------------------------------------------------------------------- #
    def batch_processor(self):
        logger.debug("batch_processor started")
        while self.running:
            close_old_connections()

            if self.tick_buffer.empty():
                time.sleep(1)
                continue

            ticks: list[dict] = []
            while not self.tick_buffer.empty():
                ticks.append(self.tick_buffer.get())

            logger.debug("Processing %d ticks", len(ticks))
            self.process_batch(ticks)

        logger.debug("batch_processor stopped")

    def process_batch(self, ticks: list[dict]):
        candle_map: Dict[tuple[int, datetime], Dict[str, Any]] = defaultdict(
            lambda: {
                "open": None,
                "high": -float("inf"),
                "low": float("inf"),
                "close": None,
                "volume": 0,
            }
        )

        with self.asset_lock:
            cache_copy = self.asset_cache.copy()

        for t in ticks:
            sym = t["S"]
            aid = cache_copy.get(sym)
            if aid is None:
                continue

            price = t["p"]
            vol = t["s"]
            # Parse ISO 8601 timestamp string
            ts_str = t["t"]
            if ts_str.endswith('Z'):
                ts_str = ts_str[:-1] + '+00:00'  # Replace Z with timezone offset
            ts = datetime.fromisoformat(ts_str)
            ts = ts.replace(second=0, microsecond=0)

            key = (aid, ts)
            c = candle_map[key]
            if c["open"] is None:
                c["open"] = c["close"] = price
            c["high"] = max(c["high"], price)
            c["low"] = min(c["low"], price)
            c["close"] = price
            c["volume"] += vol

        self.save_candles(candle_map)

    def save_candles(self, updates: Dict[tuple[int, datetime], Dict[str, Any]]):
        if not updates:
            return

        keys = list(updates.keys())
        existing = {
            (c.asset_id, c.timestamp): c
            for c in Candle.objects.filter(
                asset_id__in=[k[0] for k in keys],
                timestamp__in=[k[1] for k in keys],
                timeframe="1Min",
            )
        }

        to_create, to_update = [], []
        for (aid, ts), data in updates.items():
            if (aid, ts) in existing:
                c = existing[(aid, ts)]
                c.high = max(c.high, data["high"])
                c.low = min(c.low, data["low"])
                c.close = data["close"]
                c.volume += data["volume"]
                to_update.append(c)
            else:
                to_create.append(
                    Candle(
                        asset_id=aid,
                        timeframe="1Min",
                        timestamp=ts,
                        open=data["open"],
                        high=data["high"],
                        low=data["low"],
                        close=data["close"],
                        volume=data["volume"],
                    )
                )

        try:
            with transaction.atomic():
                if to_create:
                    Candle.objects.bulk_create(to_create, ignore_conflicts=True)
                    logger.info("🆕 %d candles", len(to_create))
                if to_update:
                    Candle.objects.bulk_update(
                        to_update, ["high", "low", "close", "volume"]
                    )
                    logger.info("🔄 %d candles", len(to_update))
        except Exception:  # noqa: BLE001
            logger.exception("bulk save failed")

    # --------------------------------------------------------------------- #
    # Auth timeout watchdog                                                 #
    # --------------------------------------------------------------------- #
    def auth_timeout_checker(self):
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
