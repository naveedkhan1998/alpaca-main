from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from main import const

from .backfill import BackfillGuard
from .persistence import CandlePersistence
from .utils import floor_to_bucket


@dataclass
class TimeframeAggregator:
    """
    Accumulates 1-minute bars into higher timeframes and persists snapshots.
    
    This aggregator maintains in-memory accumulators for each higher timeframe
    (5T, 15T, 30T, 1H, 4H, 1D) and persists them periodically.
    
    Architecture:
    - 1T (minute) candles are persisted directly via the repository
    - Higher TF candles are accumulated in memory and persisted as snapshots
    - Open (in-progress) buckets are persisted at throttled intervals
    - Closed buckets are flushed immediately
    
    Attributes:
        repo: Persistence layer for saving candles.
        backfill: Guard for checking backfill completion status.
        tf_cfg: Timeframe configuration mapping labels to timedeltas.
        logger: Optional logger for debugging.
        open_flush_secs: Throttle interval for open bucket persistence.
    
    Example:
        >>> aggregator = TimeframeAggregator(
        ...     repo=CandlePersistence(),
        ...     backfill=BackfillGuard(...),
        ... )
        >>> touched = aggregator.rollup_from_minutes(m1_map)
        >>> aggregator.persist_open(touched, latest_ts)
    """

    repo: CandlePersistence
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
    # Throttle for persisting open buckets; configurable
    open_flush_secs: float = 0.25
    _open_flush_secs: float = field(init=False)

    def __post_init__(self):
        # Mirror configurable open flush throttle into internal field
        self._open_flush_secs = self.open_flush_secs

    def reset_for_asset(self, asset_id: int) -> None:
        """
        Clear accumulators for an asset.
        
        Call this when scheduling a backfill to prevent stale data
        from being persisted while backfill is in progress.
        
        Args:
            asset_id: Asset ID to clear accumulators for.
        """
        for tf in self._tf_acc:
            acc = self._tf_acc[tf]
            keys_to_remove = [k for k in acc if k[0] == asset_id]
            for key in keys_to_remove:
                acc.pop(key, None)

    def rollup_from_minutes(
        self, m1_map: dict[tuple[int, datetime], dict[str, Any]]
    ) -> dict[str, set[tuple[int, datetime]]]:
        """
        Update in-memory accumulators for TFs > 1T from freshly built 1T bars.
        
        Args:
            m1_map: Mapping of (asset_id, minute_timestamp) to OHLCV data.
        
        Returns:
            Mapping of timeframe -> set of (asset_id, bucket_timestamp) keys
            that were touched by this rollup.
        
        Aggregation Rules:
            - open: First value seen (preserved from initial minute)
            - high: Maximum across all minutes
            - low: Minimum across all minutes
            - close: Last value seen
            - volume: Sum of all volumes
        """
        touched: dict[str, set[tuple[int, datetime]]] = defaultdict(set)
        
        for (aid, m1_ts), data in m1_map.items():
            for tf, delta in self.tf_cfg.items():
                if tf == const.TF_1T:
                    continue
                    
                bucket = floor_to_bucket(m1_ts, delta)
                acc = self._tf_acc[tf]
                key = (aid, bucket)
                
                # Convert to Decimal for precision
                open_val = self._to_decimal(data.get("open"))
                high_val = self._to_decimal(data.get("high"))
                low_val = self._to_decimal(data.get("low"))
                close_val = self._to_decimal(data.get("close"))
                volume_val = self._to_decimal(data.get("volume", 0))
                
                if key not in acc:
                    acc[key] = {
                        "open": open_val,
                        "high": high_val,
                        "low": low_val,
                        "close": close_val,
                        "volume": volume_val,
                    }
                else:
                    c = acc[key]
                    # Preserve first open
                    if c.get("open") is None and open_val is not None:
                        c["open"] = open_val
                    # Update high/low
                    if high_val is not None:
                        c["high"] = max(c.get("high") or high_val, high_val)
                    if low_val is not None:
                        c["low"] = min(c.get("low") or low_val, low_val)
                    # Update close
                    if close_val is not None:
                        c["close"] = close_val
                    # Accumulate volume
                    c["volume"] = (c.get("volume") or Decimal("0")) + (volume_val or Decimal("0"))
                    
                touched[tf].add(key)
                
        return touched

    def persist_open(
        self,
        touched_by_tf: dict[str, set[tuple[int, datetime]]],
        latest_m1: datetime,
    ) -> None:
        """
        Persist in-progress higher timeframe buckets updated in the last batch.
        
        Throttled per timeframe to avoid excessive writes. Only persists buckets
        whose end time is after the latest minute (i.e., still open).
        
        Args:
            touched_by_tf: Mapping from rollup_from_minutes.
            latest_m1: Timestamp of the most recent minute candle.
        
        Note:
            Only persists when historical backfill is complete to avoid conflicts
            with backfill data.
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
            to_persist: list[dict[str, Any]] = []
            
            for key in keys:
                aid, bucket_ts = key
                end_ts = bucket_ts + delta
                
                if end_ts > latest_m1:
                    if self.backfill.is_historical_complete(aid, tf, bucket_ts):
                        data = acc.get(key)
                        if data:
                            to_persist.append({
                                "asset_id": aid,
                                "timestamp": bucket_ts,
                                **data,
                            })
                    else:
                        if self.logger:
                            self.logger.debug(
                                "Skipping open %s bucket for asset_id=%s - backfill not complete",
                                tf,
                                aid,
                            )
                            
            if to_persist:
                self.repo.upsert_aggregated(tf, to_persist, mode="snapshot")
                self._last_open_flush[tf] = now

    def flush_closed(self, latest_m1: datetime) -> None:
        """
        Evict any higher timeframe buckets that have fully closed.
        
        Ownership model: WebSocket only writes OPEN buckets for higher TFs so
        charts update in real time. CLOSED buckets are typically handled by
        offline resamplers; however, if backfill is complete we persist the
        final snapshot when closing.
        
        Args:
            latest_m1: Timestamp of the most recent minute candle.
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
                            self.repo.upsert_aggregated(
                                tf,
                                [{
                                    "asset_id": aid,
                                    "timestamp": bucket_ts,
                                    **closed_data,
                                }],
                                mode="snapshot",
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

    @staticmethod
    def _to_decimal(value: Any) -> Decimal | None:
        """Convert a value to Decimal for financial precision."""
        if value is None:
            return None
        if isinstance(value, Decimal):
            return value
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        if isinstance(value, str):
            return Decimal(value)
        return None
