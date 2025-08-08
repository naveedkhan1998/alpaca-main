"""
Alpaca WebSocket Service
========================

A resilient, threaded client that subscribes to Alpaca market data trades and
persists OHLCV candles in multiple timeframes:
- 1 minute (1T) computed live from trades
- 5T, 15T, 30T, 1H, 4H, 1D incrementally aggregated from 1T and flushed when buckets close

Architecture
- WebSocket thread: handles I/O, authentication, subscription messages
- Subscription manager thread: periodically reconciles watchlist symbols
- Batch processor thread: consumes ticks, aggregates to 1T and higher TFs, writes to DB
- Auth timeout watchdog: restarts socket if auth does not complete in time

Usage
Run as a separate service/process:
    python manage.py run_websocket [--sandbox]

Notes
- Uses Django ORM (Candle model) with unique constraint (asset, timeframe, timestamp)
- Safe bulk upsert pattern: bulk_create(ignore_conflicts=True) + bulk_update
- Timezones: all timestamps are stored as timezone-aware UTC datetimes
"""

import json
import logging
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple, Set
from queue import Queue

import pytz
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
    """Persistent, high-performance WebSocket client for Alpaca data.

    Responsibilities
    - Maintain a stable WS connection with heartbeats and re-connects
    - Track watchlist symbols and subscribe/unsubscribe as needed
    - Aggregate trade ticks to candles and persist them efficiently
    """

    # --------------------------------------------------------------------- #
    # Construction / connection                                             #
    # --------------------------------------------------------------------- #
    def __init__(self, account_id: int, sandbox: bool = False):
        """Initialize the client with an Alpaca account and mode.

        Args:
            account_id: Primary key of the AlpacaAccount with API credentials
            sandbox: When True, connects to Alpaca sandbox stream
        """
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

        # Timeframe aggregation config
        self.TF_CFG: dict[str, timedelta] = {
            "1T": timedelta(minutes=1),
            "5T": timedelta(minutes=5),
            "15T": timedelta(minutes=15),
            "30T": timedelta(minutes=30),
            "1H": timedelta(hours=1),
            "4H": timedelta(hours=4),
            "1D": timedelta(days=1),
        }
        # Accumulators for higher timeframes; 1T is written directly from trades
        self._tf_acc: dict[str, dict[tuple[int, datetime], dict[str, Any]]] = {
            tf: {} for tf in self.TF_CFG if tf != "1T"
        }

        self._connect()

    def _get_ws_url(self) -> str:
        """Return the WS endpoint for the chosen environment."""
        domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        return f"wss://{domain}/v2/iex"

    def _get_api_credentials(self) -> tuple[str, str]:
        """Load API key/secret from the DB for the configured account."""
        try:
            acct = AlpacaAccount.objects.get(id=self.account_id)
            return acct.api_key, acct.api_secret
        except AlpacaAccount.DoesNotExist:
            logger.error("AlpacaAccount id=%s not found", self.account_id)
            raise

    def _connect(self):
        """Build the WebSocketApp and bind handlers."""
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
        """Start background worker threads and block in the socket loop."""
        self.running = True
        threading.Thread(target=self.subscription_manager, daemon=True).start()
        threading.Thread(target=self.batch_processor, daemon=True).start()
        threading.Thread(target=self.auth_timeout_checker, daemon=True).start()
        self.run_forever()  # blocks

    def run_forever(self):
        """Main socket loop with keepalive and automatic reconnects."""
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
        """Stop the client and close the socket."""
        self.running = False
        if self.ws_app:
            self.ws_app.close()

    # --------------------------------------------------------------------- #
    # WebSocket callbacks                                                   #
    # --------------------------------------------------------------------- #
    def on_open(self, _ws):
        """WS open handler; kick off authentication."""
        logger.info("Socket open → authenticating")
        self.authenticate()

    def authenticate(self):
        """Send auth message and start timeout tracking."""
        self.auth_start_time = time.time()
        payload = {"action": "auth", "key": self.api_key, "secret": self.secret_key}
        try:
            self.ws_app.send(json.dumps(payload))
        except Exception as exc:  # noqa: BLE001
            logger.exception("Auth send failed: %s", exc)
            self.stop()

    def on_message(self, _ws, raw: str):
        """Route inbound WS messages and buffer trade ticks for batch processing."""
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
        """WS error handler (non-fatal)."""
        logger.error("WS error: %s", error)

    def on_close(self, *_args):
        """WS close handler; clear auth state so loop can reconnect."""
        self.authenticated = False
        self.auth_start_time = None
        logger.warning("Socket closed")

    # --------------------------------------------------------------------- #
    # Subscription management                                               #
    # --------------------------------------------------------------------- #
    def get_watchlist_symbols(self) -> set[str]:
        """Return the current set of active symbols from all active watchlists."""
        symbols = set(
            WatchListAsset.objects.filter(
                watchlist__is_active=True, is_active=True
            ).values_list("asset__symbol", flat=True)
        )
        return symbols

    def update_asset_cache(self, symbols: set[str]):
        """Resolve symbol→asset_id and warn about recent gaps on 1T data."""
        assets = Asset.objects.filter(symbol__in=symbols).values("symbol", "id")
        with self.asset_lock:
            new_mappings = {a["symbol"]: a["id"] for a in assets}
            self.asset_cache.update(new_mappings)
            logger.debug("Updated asset cache with %d symbols: %s", len(new_mappings), new_mappings)
            
        # Warn if we have gaps on 1-minute timeframe
        for symbol in symbols:
            if symbol in new_mappings:
                asset_id = new_mappings[symbol]
                latest_candle = Candle.objects.filter(
                    asset_id=asset_id, 
                    timeframe="1T"
                ).order_by("-timestamp").first()
                
                if latest_candle:
                    time_diff = timezone.now() - latest_candle.timestamp
                    if time_diff.total_seconds() > 120:
                        logger.warning(
                            "Asset %s latest 1T candle is %s old. Historical fetch may be needed.",
                            symbol,
                            time_diff,
                        )

    def subscription_manager(self):
        """Background task: periodically reconcile desired vs actual subscriptions."""
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
        """Subscribe/unsubscribe to match active watchlist symbols."""
        if not self.authenticated:
            return

        current = self.get_watchlist_symbols()

        with self.sub_lock:
            new = current - self.subscribed_symbols
            gone = self.subscribed_symbols - current

            if new or gone:
                logger.debug("Subscription update: current=%s, subscribed=%s, new=%s, gone=%s", 
                           current, self.subscribed_symbols, new, gone)

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

    def subscribe(self, symbols: list[str]):
        """Send a subscribe request (no-op if socket not ready)."""
        if not (self.authenticated and self._sock_ready() and symbols):
            return
        try:
            self.ws_app.send(json.dumps({"action": "subscribe", "trades": symbols}))
            logger.info("→ subscribe %s", symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("subscribe failed: %s", exc)

    def unsubscribe(self, symbols: list[str]):
        """Send an unsubscribe request (no-op if socket not ready)."""
        if not (self.authenticated and self._sock_ready() and symbols):
            return
        try:
            self.ws_app.send(json.dumps({"action": "unsubscribe", "trades": symbols}))
            logger.info("→ unsubscribe %s", symbols)
        except Exception as exc:  # noqa: BLE001
            logger.exception("unsubscribe failed: %s", exc)

    def _sock_ready(self) -> bool:
        """True if underlying websocket is connected."""
        return self.ws_app and self.ws_app.sock and self.ws_app.sock.connected

    # --------------------------------------------------------------------- #
    # Tick batching + candle writes                                         #
    # --------------------------------------------------------------------- #
    def batch_processor(self):
        """Consumer loop: drain tick buffer and process in batches."""
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

    def _parse_tick_timestamp(self, ts_str: str) -> datetime:
        """Parse an Alpaca ISO8601 timestamp to timezone-aware UTC minute precision."""
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        ts = datetime.fromisoformat(ts_str)
        if ts.tzinfo is None:
            ts = timezone.make_aware(ts, pytz.UTC)
        return ts.replace(second=0, microsecond=0)

    def _floor_to_bucket(self, ts: datetime, delta: timedelta) -> datetime:
        """Floor a timestamp to the start of its timeframe bucket in UTC."""
        if ts.tzinfo is None:
            ts = timezone.make_aware(ts, pytz.UTC)
        # use unix-minute math for robust flooring
        minutes = int(delta.total_seconds() // 60)
        if minutes <= 0:
            return ts.replace(second=0, microsecond=0)
        total_min = int(ts.timestamp() // 60)
        bucket_min = (total_min // minutes) * minutes
        return datetime.fromtimestamp(bucket_min * 60, tz=pytz.UTC)

    def process_batch(self, ticks: list[dict]):
        """Aggregate trades into 1T bars, persist, then roll up higher timeframes."""
        # First aggregate to 1T (minute) bars from trades
        m1_map: Dict[tuple[int, datetime], Dict[str, Any]] = defaultdict(
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

        latest_ts: Optional[datetime] = None
        for t in ticks:
            sym = t.get("S")
            aid = cache_copy.get(sym)
            if aid is None:
                continue

            price = t.get("p")
            vol = t.get("s", 0)
            ts_str = t.get("t")
            if price is None or ts_str is None:
                continue

            ts = self._parse_tick_timestamp(ts_str)

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
        self.save_candles("1T", m1_map)

        # Fetch the PKs we just created/updated for linkage use
        # Note: we read back minimal set for recent minutes only to avoid heavy queries
        recent_minute_keys = list(m1_map.keys())
        minute_ids_by_key: Dict[tuple[int, datetime], int] = {}
        if recent_minute_keys:
            asset_ids = list({k[0] for k in recent_minute_keys})
            minutes = [k[1] for k in recent_minute_keys]
            existing = Candle.objects.filter(
                asset_id__in=asset_ids,
                timestamp__in=minutes,
                timeframe="1T",
            ).values_list("asset_id", "timestamp", "id")
            for aid, ts, cid in existing:
                minute_ids_by_key[(aid, ts)] = cid

        # Update higher timeframe accumulators and flush completed buckets
        if latest_ts:
            self._update_higher_timeframes(m1_map)
            # Attach minute ids to accumulators if available
            for tf, delta in self.TF_CFG.items():
                if tf == "1T":
                    continue
                acc = self._tf_acc[tf]
                for (aid, m1_ts), _ in m1_map.items():
                    bucket = self._floor_to_bucket(m1_ts, delta)
                    key = (aid, bucket)
                    acc.setdefault(key, {})
                    ids_list = acc[key].setdefault("minute_candle_ids", [])
                    mid = minute_ids_by_key.get((aid, m1_ts))
                    if mid is not None:
                        ids_list.append(mid)
            self._flush_closed_buckets(latest_ts)

    def _update_higher_timeframes(self, m1_map: Dict[tuple[int, datetime], Dict[str, Any]]):
        """Update in-memory accumulators for TFs > 1T from freshly built 1T bars."""
        for (aid, m1_ts), data in m1_map.items():
            # Fan out to each higher timeframe
            for tf, delta in self.TF_CFG.items():
                if tf == "1T":
                    continue
                bucket = self._floor_to_bucket(m1_ts, delta)
                acc = self._tf_acc[tf]
                key = (aid, bucket)
                if key not in acc:
                    acc[key] = {
                        "open": data["open"],
                        "high": data["high"],
                        "low": data["low"],
                        "close": data["close"],
                        "volume": data["volume"],
                    }
                else:
                    c = acc[key]
                    if c["open"] is None:
                        c["open"] = data["open"]
                    c["high"] = max(c["high"], data["high"])
                    c["low"] = min(c["low"], data["low"])
                    c["close"] = data["close"]
                    c["volume"] += data["volume"]

    def _flush_closed_buckets(self, latest_m1: datetime):
        """Persist and evict any higher-TF buckets that have fully closed."""
        for tf, delta in self.TF_CFG.items():
            if tf == "1T":
                continue
            acc = self._tf_acc[tf]
            if not acc:
                continue
            to_persist: Dict[tuple[int, datetime], Dict[str, Any]] = {}
            for (aid, bucket_ts), data in list(acc.items()):
                end_ts = bucket_ts + delta
                if end_ts <= latest_m1:
                    to_persist[(aid, bucket_ts)] = data
                    acc.pop((aid, bucket_ts), None)
            if to_persist:
                self.save_candles(tf, to_persist)

    def save_candles(self, timeframe: str, updates: Dict[tuple[int, datetime], Dict[str, Any]]):
        """Upsert a batch of candles for a given timeframe.

        Strategy: fetch existing rows keyed by (asset_id, timestamp, timeframe),
        then use bulk_create(ignore_conflicts=True) + bulk_update to merge.
        """
        if not updates:
            return

        keys = list(updates.keys())
        existing = {
            (c.asset_id, c.timestamp): c
            for c in Candle.objects.filter(
                asset_id__in=[k[0] for k in keys],
                timestamp__in=[k[1] for k in keys],
                timeframe=timeframe,
            )
        }

        to_create, to_update = [], []
        for (aid, ts), data in updates.items():
            if (aid, ts) in existing:
                c = existing[(aid, ts)]
                # Merge
                if c.open is None and data.get("open") is not None:
                    c.open = data["open"]
                c.high = max(c.high, data.get("high")) if c.high is not None else data.get("high")
                c.low = min(c.low, data.get("low")) if c.low is not None else data.get("low")
                c.close = data.get("close")
                c.volume = (c.volume or 0) + (data.get("volume") or 0)
                # merge minute ids if provided
                mids = data.get("minute_candle_ids")
                if mids:
                    existing_mids = set(c.minute_candle_ids or [])
                    for mid in mids:
                        if mid not in existing_mids:
                            existing_mids.add(mid)
                    c.minute_candle_ids = list(existing_mids)
                to_update.append(c)
            else:
                to_create.append(
                    Candle(
                        asset_id=aid,
                        timeframe=timeframe,
                        timestamp=ts,
                        open=data.get("open"),
                        high=data.get("high"),
                        low=data.get("low"),
                        close=data.get("close"),
                        volume=data.get("volume"),
                        minute_candle_ids=data.get("minute_candle_ids"),
                    )
                )

        try:
            with transaction.atomic():
                if to_create:
                    Candle.objects.bulk_create(to_create, ignore_conflicts=True)
                    logger.info("🆕 %d %s candles", len(to_create), timeframe)
                if to_update:
                    Candle.objects.bulk_update(
                        to_update, ["open", "high", "low", "close", "volume"]
                    )
                    logger.info("🔄 %d %s candles", len(to_update), timeframe)
        except Exception:  # noqa: BLE001
            logger.exception("bulk save failed for timeframe %s", timeframe)

    # --------------------------------------------------------------------- #
    # Auth timeout watchdog                                                 #
    # --------------------------------------------------------------------- #
    def auth_timeout_checker(self):
        """Background watchdog: close the socket if auth hangs too long."""
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
