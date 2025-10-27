from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from main import const

from .backfill import BackfillGuard
from .persistence import CandleRepository
from .utils import floor_to_bucket


@dataclass
class TimeframeAggregator:
    """Accumulates 1T bars into higher timeframes and persists snapshots."""

    repo: CandleRepository
    backfill: BackfillGuard
    tf_cfg: dict[str, timedelta] = field(default_factory=lambda: const.TF_CFG)
    logger: Any | None = None

    # Accumulators for higher timeframes; 1T is persisted directly
    _tf_acc: dict[str, dict[tuple[int, datetime], dict[str, Any]]] = field(
        default_factory=lambda: {tf: {} for tf in const.TF_CFG if tf != const.TF_1T}
    )
    _last_open_flush: dict[str, float] = field(
        default_factory=lambda: {tf: 0.0 for tf in const.TF_CFG if tf != const.TF_1T}
    )
    _open_flush_secs: float = 2.0

    def reset_for_asset(self, asset_id: int) -> None:
        """Clear accumulators for an asset (e.g., after scheduling backfill)."""
        for tf in self._tf_acc:
            acc = self._tf_acc[tf]
            keys_to_remove = [k for k in acc if k[0] == asset_id]
            for key in keys_to_remove:
                acc.pop(key, None)

    def rollup_from_minutes(self, m1_map: dict[tuple[int, datetime], dict[str, Any]]):
        """Update in-memory accumulators for TFs > 1T from freshly built 1T bars.

        Returns mapping timeframe -> set of keys (asset_id, bucket_ts) that were touched.
        """
        touched: dict[str, set[tuple[int, datetime]]] = defaultdict(set)
        for (aid, m1_ts), data in m1_map.items():
            for tf, delta in self.tf_cfg.items():
                if tf == const.TF_1T:
                    continue
                bucket = floor_to_bucket(m1_ts, delta)
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
                    if c.get("open") is None:
                        c["open"] = data["open"]
                    c["high"] = max(c.get("high", data["high"]), data["high"])
                    c["low"] = min(c.get("low", data["low"]), data["low"])
                    c["close"] = data["close"]
                    c["volume"] = (c.get("volume") or 0) + (data.get("volume") or 0)
                touched[tf].add(key)
        return touched

    def persist_open(
        self, touched_by_tf: dict[str, set[tuple[int, datetime]]], latest_m1: datetime
    ):
        """Persist in-progress higher timeframe buckets updated in the last batch.

        Throttled per timeframe to avoid excessive writes. Only persist buckets whose
        end time is after the latest minute (i.e., still open). Persist only when
        historical backfill is complete to avoid conflicts.
        """
        import time as _time

        now = _time.time()
        for tf, keys in (touched_by_tf or {}).items():
            if tf == const.TF_1T or not keys:
                continue
            last = self._last_open_flush.get(tf, 0.0)
            if now - last < self._open_flush_secs:
                continue
            delta = self.tf_cfg[tf]
            acc = self._tf_acc.get(tf, {})
            to_persist: dict[tuple[int, datetime], dict[str, Any]] = {}
            for key in keys:
                aid, bucket_ts = key
                end_ts = bucket_ts + delta
                if end_ts > latest_m1:
                    if self.backfill.is_historical_complete(aid, tf, bucket_ts):
                        data = acc.get(key)
                        if data:
                            to_persist[key] = data
                    else:
                        if self.logger:
                            self.logger.debug(
                                "Skipping open %s bucket for asset_id=%s - backfill not complete",
                                tf,
                                aid,
                            )
            if to_persist:
                self.repo.save_candles(
                    tf, to_persist, write_mode="snapshot", logger=self.logger
                )
                self._last_open_flush[tf] = now

    def flush_closed(self, latest_m1: datetime):
        """Evict any higher timeframe buckets that have fully closed.

        Ownership model: WebSocket only writes OPEN buckets for higher TFs so charts
        update in real time. CLOSED buckets are typically handled by offline resamplers;
        however, if backfill is complete we persist the final snapshot when closing.
        """
        for tf, delta in self.tf_cfg.items():
            if tf == const.TF_1T:
                continue
            acc = self._tf_acc[tf]
            if not acc:
                continue
            for (aid, bucket_ts), _data in list(acc.items()):
                end_ts = bucket_ts + delta
                if end_ts <= latest_m1:
                    if self.backfill.is_historical_complete(aid, tf, bucket_ts):
                        closed_data = acc.pop((aid, bucket_ts), None)
                        if closed_data:
                            self.repo.save_candles(
                                tf,
                                {(aid, bucket_ts): closed_data},
                                write_mode="snapshot",
                                logger=self.logger,
                            )
                            if self.logger:
                                self.logger.info(
                                    "Persisted closed %s bucket for asset_id=%s at %s",
                                    tf,
                                    aid,
                                    bucket_ts,
                                )
                    else:
                        acc.pop((aid, bucket_ts), None)
                        if self.logger:
                            self.logger.debug(
                                "Skipping closed %s bucket for asset_id=%s - backfill not complete",
                                tf,
                                aid,
                            )
