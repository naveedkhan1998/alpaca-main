from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from datetime import datetime, timedelta
import time
from typing import Any

from django.utils import timezone
import pytz

from apps.core.models import Candle

from .repository import MarketRepository


class CandleAggregator:
    """Aggregates ticks into multiple timeframe candles and persists them."""

    def __init__(
        self,
        repo: MarketRepository,
        tf_cfg: dict[str, timedelta],
        tf_acc: dict[str, dict[tuple[int, datetime], dict[str, Any]]],
        last_open_flush: dict[str, float],
        open_flush_secs: float,
    ) -> None:
        self.repo = repo
        self.TF_CFG = tf_cfg
        self._tf_acc = tf_acc
        self._last_open_flush = last_open_flush
        self._open_flush_secs = open_flush_secs

    # ---------------- Time Helpers ----------------

    def _parse_ts(self, ts_str: str) -> datetime:
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        ts = datetime.fromisoformat(ts_str)
        if ts.tzinfo is None:
            ts = timezone.make_aware(ts, pytz.UTC)
        return ts.replace(second=0, microsecond=0)

    def _floor(self, ts: datetime, delta: timedelta) -> datetime:
        if ts.tzinfo is None:
            ts = timezone.make_aware(ts, pytz.UTC)
        minutes = int(delta.total_seconds() // 60)
        total_min = int(ts.timestamp() // 60)
        bucket_min = (total_min // minutes) * minutes
        return datetime.fromtimestamp(bucket_min * 60, tz=pytz.UTC)

    # ---------------- Aggregation ----------------

    def aggregate_to_1T(
        self,
        ticks: list[dict[str, Any]],
        asset_cache: dict[str, int],
        asset_class_cache: dict[int, str],
        is_rth_fn: Callable[[datetime], bool],
    ) -> tuple[dict[tuple[int, datetime], dict[str, Any]], datetime | None]:
        """Build 1T candles from ticks."""
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

        for t in ticks:
            sym = t.get("S")
            aid = asset_cache.get(sym)
            if aid is None:
                continue
            price, vol, ts_str = t.get("p"), t.get("s", 0), t.get("t")
            if price is None or ts_str is None:
                continue
            ts = self._parse_ts(ts_str)
            asset_class = asset_class_cache.get(aid)
            if asset_class in {"us_equity", "us_option"} and not is_rth_fn(ts):
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
        return m1_map, latest_ts

    def persist_1T(self, m1_map: dict[tuple[int, datetime], dict[str, Any]]) -> None:
        self.save_candles("1T", m1_map)

    def rollup_higher_timeframes(
        self, m1_map: dict[tuple[int, datetime], dict[str, Any]]
    ) -> dict[str, set[tuple[int, datetime]]]:
        touched: dict[str, set[tuple[int, datetime]]] = {
            tf: set() for tf in self._tf_acc
        }
        for (aid, m1_ts), data in m1_map.items():
            for tf, delta in self.TF_CFG.items():
                if tf == "1T":
                    continue
                bucket = self._floor(m1_ts, delta)
                acc = self._tf_acc[tf]
                key = (aid, bucket)
                if key not in acc:
                    acc[key] = data.copy()
                else:
                    acc[key]["high"] = max(acc[key]["high"], data["high"])
                    acc[key]["low"] = min(acc[key]["low"], data["low"])
                    acc[key]["close"] = data["close"]
                    acc[key]["volume"] += data["volume"]
                touched[tf].add(key)
        return touched

    # ---------------- New Methods ----------------

    def persist_open_buckets(
        self, touched_by_tf: dict[str, set[tuple[int, datetime]]], latest_m1: datetime
    ) -> None:
        """Persist in-progress higher TF buckets updated in the last batch."""
        now = time.time()
        for tf, keys in (touched_by_tf or {}).items():
            if tf == "1T" or not keys:
                continue
            last = self._last_open_flush.get(tf, 0.0)
            if now - last < self._open_flush_secs:
                continue
            delta = self.TF_CFG[tf]
            acc = self._tf_acc.get(tf, {})
            to_persist: dict[tuple[int, datetime], dict[str, Any]] = {}
            for key in keys:
                aid, bucket_ts = key
                end_ts = bucket_ts + delta
                if end_ts > latest_m1:
                    data = acc.get(key)
                    if data:
                        to_persist[key] = data
            if to_persist:
                self.save_candles(tf, to_persist)
                self._last_open_flush[tf] = now

    def flush_closed_buckets(self, latest_m1: datetime) -> None:
        """Persist and evict any higher TF buckets that have fully closed."""
        for tf, delta in self.TF_CFG.items():
            if tf == "1T":
                continue
            acc = self._tf_acc[tf]
            if not acc:
                continue
            to_persist: dict[tuple[int, datetime], dict[str, Any]] = {}
            for (aid, bucket_ts), data in list(acc.items()):
                end_ts = bucket_ts + delta
                if end_ts <= latest_m1:
                    to_persist[(aid, bucket_ts)] = data
                    acc.pop((aid, bucket_ts), None)
            if to_persist:
                self.save_candles(tf, to_persist)

    # ---------------- Persistence ----------------

    def save_candles(
        self, timeframe: str, updates: dict[tuple[int, datetime], dict[str, Any]]
    ) -> None:
        if not updates:
            return
        keys = list(updates.keys())
        existing_map = {
            (c.asset_id, c.timestamp): c
            for c in self.repo.get_existing_candles(
                [k[0] for k in keys], [k[1] for k in keys], timeframe
            )
        }
        to_create: list[Candle] = []
        to_update: list[Candle] = []

        for (aid, ts), data in updates.items():
            if (aid, ts) in existing_map:
                c = existing_map[(aid, ts)]
                if c.open is None:
                    c.open = data["open"]
                c.high = max(c.high, data["high"])
                c.low = min(c.low, data["low"])
                c.close = data["close"]
                c.volume += data["volume"]
                to_update.append(c)
            else:
                to_create.append(
                    Candle(
                        asset_id=aid,
                        timeframe=timeframe,
                        timestamp=ts,
                        open=data["open"],
                        high=data["high"],
                        low=data["low"],
                        close=data["close"],
                        volume=data["volume"],
                    )
                )

        if to_create:
            self.repo.bulk_create_candles(to_create)
        if to_update:
            self.repo.bulk_update_candles(
                to_update, ["open", "high", "low", "close", "volume"]
            )
