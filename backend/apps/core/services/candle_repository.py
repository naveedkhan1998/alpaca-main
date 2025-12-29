"""
Candle repository with PostgreSQL-native upserts.

This module provides high-performance persistence for candle data using
PostgreSQL's INSERT ... ON CONFLICT UPDATE (upsert) functionality instead
of the previous fetch-merge-update pattern.

Performance Benefits:
--------------------
1. Single round-trip per batch instead of fetch + create + update
2. Atomic operations without explicit transactions for simple upserts
3. Database-level GREATEST/LEAST for high/low calculations
4. No Python-side data loading for existing records

Usage:
------
    from apps.core.services.candle_repository import CandleRepository
    
    repo = CandleRepository()
    
    # Upsert minute candles
    repo.upsert_minute_candles([
        {"asset_id": 1, "timestamp": dt, "open": "150.25", ...},
        ...
    ])
    
    # Upsert aggregated candles
    repo.upsert_aggregated_candles("1H", [...])
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any, Sequence

from django.db import connection, transaction

from main import const

logger = logging.getLogger(__name__)


@dataclass
class CandleRepository:
    """
    High-performance repository for candle data persistence.
    
    Uses PostgreSQL-native upserts for efficient batch operations.
    Supports both minute candles and aggregated (higher timeframe) candles.
    
    Attributes:
        batch_size: Maximum number of records per INSERT statement.
                   Larger batches are more efficient but use more memory.
    
    Example:
        >>> repo = CandleRepository()
        >>> repo.upsert_minute_candles([
        ...     {
        ...         "asset_id": 1,
        ...         "timestamp": datetime(2024, 1, 15, 9, 30),
        ...         "open": Decimal("150.25"),
        ...         "high": Decimal("150.50"),
        ...         "low": Decimal("150.00"),
        ...         "close": Decimal("150.35"),
        ...         "volume": Decimal("10000"),
        ...     }
        ... ])
    """

    batch_size: int = field(default=1000)

    def upsert_minute_candles(
        self,
        candles: Sequence[dict[str, Any]],
        *,
        mode: str = "delta",
    ) -> int:
        """
        Upsert 1-minute candles using PostgreSQL ON CONFLICT.
        
        Args:
            candles: List of candle dicts with keys:
                - asset_id: int
                - timestamp: datetime
                - open: Decimal
                - high: Decimal
                - low: Decimal
                - close: Decimal
                - volume: Decimal
                - trade_count: Optional[int]
                - vwap: Optional[Decimal]
            mode: "delta" adds volume to existing, "snapshot" replaces.
        
        Returns:
            Number of rows affected (inserted + updated).
        
        SQL Strategy:
            INSERT INTO core_minute_candle (...)
            VALUES (...)
            ON CONFLICT (asset_id, timestamp) DO UPDATE SET
                high = GREATEST(excluded.high, core_minute_candle.high),
                low = LEAST(excluded.low, core_minute_candle.low),
                close = excluded.close,
                volume = core_minute_candle.volume + excluded.volume  -- delta mode
        """
        if not candles:
            return 0

        total_affected = 0

        # Process in batches
        for i in range(0, len(candles), self.batch_size):
            batch = candles[i : i + self.batch_size]
            affected = self._upsert_minute_batch(batch, mode)
            total_affected += affected

        return total_affected

    def _upsert_minute_batch(
        self,
        batch: Sequence[dict[str, Any]],
        mode: str,
    ) -> int:
        """Execute a single batch upsert for minute candles."""
        if not batch:
            return 0

        # Build the volume update expression based on mode
        if mode == "snapshot":
            volume_expr = "EXCLUDED.volume"
        else:  # delta mode - add volumes
            volume_expr = "COALESCE(core_minute_candle.volume, 0) + EXCLUDED.volume"

        # Build VALUES clause with placeholders
        placeholders = []
        params = []

        for candle in batch:
            placeholders.append("(%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
            params.extend([
                candle["asset_id"],
                candle["timestamp"],
                self._to_decimal(candle.get("open")),
                self._to_decimal(candle.get("high")),
                self._to_decimal(candle.get("low")),
                self._to_decimal(candle.get("close")),
                self._to_decimal(candle.get("volume", 0)),
                candle.get("trade_count"),
                self._to_decimal(candle.get("vwap")),
            ])

        sql = f"""
            INSERT INTO core_minute_candle (
                asset_id, timestamp, open, high, low, close, volume, trade_count, vwap, created_at
            )
            VALUES {", ".join(placeholders)}
            ON CONFLICT (asset_id, timestamp) DO UPDATE SET
                open = CASE 
                    WHEN core_minute_candle.open IS NULL THEN EXCLUDED.open
                    ELSE core_minute_candle.open
                END,
                high = GREATEST(COALESCE(core_minute_candle.high, EXCLUDED.high), EXCLUDED.high),
                low = LEAST(COALESCE(core_minute_candle.low, EXCLUDED.low), EXCLUDED.low),
                close = EXCLUDED.close,
                volume = {volume_expr},
                trade_count = COALESCE(EXCLUDED.trade_count, core_minute_candle.trade_count),
                vwap = COALESCE(EXCLUDED.vwap, core_minute_candle.vwap)
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.rowcount

    def upsert_aggregated_candles(
        self,
        timeframe: str,
        candles: Sequence[dict[str, Any]],
        *,
        mode: str = "snapshot",
    ) -> int:
        """
        Upsert aggregated candles for a specific timeframe.
        
        Args:
            timeframe: One of "5T", "15T", "30T", "1H", "4H", "1D".
            candles: List of candle dicts (same structure as minute candles).
            mode: "delta" adds volume, "snapshot" replaces (default for aggregated).
        
        Returns:
            Number of rows affected.
        
        Note:
            For aggregated candles, "snapshot" mode is typically used since
            we're replacing the entire bucket with updated aggregations.
        """
        if not candles:
            return 0

        # Validate timeframe
        valid_timeframes = {"5T", "15T", "30T", "1H", "4H", "1D"}
        if timeframe not in valid_timeframes:
            raise ValueError(f"Invalid timeframe: {timeframe}. Must be one of {valid_timeframes}")

        total_affected = 0

        for i in range(0, len(candles), self.batch_size):
            batch = candles[i : i + self.batch_size]
            affected = self._upsert_aggregated_batch(timeframe, batch, mode)
            total_affected += affected

        return total_affected

    def _upsert_aggregated_batch(
        self,
        timeframe: str,
        batch: Sequence[dict[str, Any]],
        mode: str,
    ) -> int:
        """Execute a single batch upsert for aggregated candles."""
        if not batch:
            return 0

        if mode == "snapshot":
            volume_expr = "EXCLUDED.volume"
        else:
            volume_expr = "COALESCE(core_aggregated_candle.volume, 0) + EXCLUDED.volume"

        placeholders = []
        params = []

        for candle in batch:
            placeholders.append("(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
            params.extend([
                candle["asset_id"],
                timeframe,
                candle["timestamp"],
                self._to_decimal(candle.get("open")),
                self._to_decimal(candle.get("high")),
                self._to_decimal(candle.get("low")),
                self._to_decimal(candle.get("close")),
                self._to_decimal(candle.get("volume", 0)),
                candle.get("trade_count"),
                self._to_decimal(candle.get("vwap")),
            ])

        sql = f"""
            INSERT INTO core_aggregated_candle (
                asset_id, timeframe, timestamp, open, high, low, close, volume, trade_count, vwap, created_at
            )
            VALUES {", ".join(placeholders)}
            ON CONFLICT (asset_id, timeframe, timestamp) DO UPDATE SET
                open = CASE 
                    WHEN core_aggregated_candle.open IS NULL THEN EXCLUDED.open
                    ELSE core_aggregated_candle.open
                END,
                high = GREATEST(COALESCE(core_aggregated_candle.high, EXCLUDED.high), EXCLUDED.high),
                low = LEAST(COALESCE(core_aggregated_candle.low, EXCLUDED.low), EXCLUDED.low),
                close = EXCLUDED.close,
                volume = {volume_expr},
                trade_count = COALESCE(EXCLUDED.trade_count, core_aggregated_candle.trade_count),
                vwap = COALESCE(EXCLUDED.vwap, core_aggregated_candle.vwap)
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.rowcount

    def bulk_insert_minute_candles(
        self,
        candles: Sequence[dict[str, Any]],
        *,
        ignore_conflicts: bool = True,
    ) -> int:
        """
        Bulk insert minute candles (no update on conflict).
        
        Use this for historical backfill where you know the data is new.
        Faster than upsert because no update logic is needed.
        
        Args:
            candles: List of candle dicts.
            ignore_conflicts: If True, silently skip duplicates.
        
        Returns:
            Number of rows inserted.
        """
        if not candles:
            return 0

        total_inserted = 0

        for i in range(0, len(candles), self.batch_size):
            batch = candles[i : i + self.batch_size]
            inserted = self._bulk_insert_minute_batch(batch, ignore_conflicts)
            total_inserted += inserted

        return total_inserted

    def _bulk_insert_minute_batch(
        self,
        batch: Sequence[dict[str, Any]],
        ignore_conflicts: bool,
    ) -> int:
        """Execute a single bulk insert for minute candles."""
        if not batch:
            return 0

        conflict_clause = "ON CONFLICT DO NOTHING" if ignore_conflicts else ""

        placeholders = []
        params = []

        for candle in batch:
            placeholders.append("(%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())")
            params.extend([
                candle["asset_id"],
                candle["timestamp"],
                self._to_decimal(candle.get("open")),
                self._to_decimal(candle.get("high")),
                self._to_decimal(candle.get("low")),
                self._to_decimal(candle.get("close")),
                self._to_decimal(candle.get("volume", 0)),
                candle.get("trade_count"),
                self._to_decimal(candle.get("vwap")),
            ])

        sql = f"""
            INSERT INTO core_minute_candle (
                asset_id, timestamp, open, high, low, close, volume, trade_count, vwap, created_at
            )
            VALUES {", ".join(placeholders)}
            {conflict_clause}
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.rowcount

    def aggregate_to_timeframe(
        self,
        asset_id: int,
        timeframe: str,
        start: datetime,
        end: datetime,
    ) -> int:
        """
        Aggregate minute candles to a higher timeframe using SQL.
        
        Uses PostgreSQL's date_bin() function for efficient bucket alignment
        and aggregation entirely on the database side.
        
        Args:
            asset_id: Asset to aggregate for.
            timeframe: Target timeframe (5T, 15T, 30T, 1H, 4H, 1D).
            start: Start of the aggregation window.
            end: End of the aggregation window.
        
        Returns:
            Number of aggregated candles upserted.
        """
        interval_map = {
            "5T": "5 minutes",
            "15T": "15 minutes",
            "30T": "30 minutes",
            "1H": "1 hour",
            "4H": "4 hours",
            "1D": "1 day",
        }

        if timeframe not in interval_map:
            raise ValueError(f"Invalid timeframe: {timeframe}")

        interval = interval_map[timeframe]

        # Market open anchor for bucket alignment (9:30 AM ET)
        # Using a fixed timestamp that represents market open
        anchor = "1970-01-01 09:30:00-05:00"

        sql = """
            INSERT INTO core_aggregated_candle (
                asset_id, timeframe, timestamp, open, high, low, close, volume, trade_count, vwap, created_at
            )
            SELECT 
                asset_id,
                %s as timeframe,
                date_bin(%s::interval, timestamp, %s::timestamptz) as bucket,
                (ARRAY_AGG(open ORDER BY timestamp ASC))[1] as open,
                MAX(high) as high,
                MIN(low) as low,
                (ARRAY_AGG(close ORDER BY timestamp DESC))[1] as close,
                SUM(volume) as volume,
                SUM(trade_count) as trade_count,
                SUM(volume * vwap) / NULLIF(SUM(volume), 0) as vwap,
                NOW() as created_at
            FROM core_minute_candle
            WHERE asset_id = %s
              AND timestamp >= %s
              AND timestamp < %s
            GROUP BY asset_id, bucket
            ON CONFLICT (asset_id, timeframe, timestamp) DO UPDATE SET
                open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume,
                trade_count = EXCLUDED.trade_count,
                vwap = EXCLUDED.vwap
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [timeframe, interval, anchor, asset_id, start, end])
            return cursor.rowcount

    @staticmethod
    def _to_decimal(value: Any) -> Decimal | None:
        """Convert a value to Decimal, handling None and various types."""
        if value is None:
            return None
        if isinstance(value, Decimal):
            return value
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        if isinstance(value, str):
            return Decimal(value)
        return None


# Legacy compatibility layer
# TODO: Remove after migration is complete

@dataclass
class LegacyCandleRepository:
    """
    Backward-compatible repository using the old Candle model.
    
    This is provided for migration purposes. New code should use
    CandleRepository with the new MinuteCandle/AggregatedCandle models.
    """

    def save_candles(
        self,
        timeframe: str,
        updates: dict[tuple[int, datetime], dict[str, Any]],
        *,
        write_mode: str = "delta",
        logger=None,
    ) -> None:
        """
        Legacy upsert method matching old interface.
        
        Converts to new format and delegates to CandleRepository.
        """
        if not updates:
            return

        repo = CandleRepository()
        candles = [
            {
                "asset_id": asset_id,
                "timestamp": timestamp,
                **data,
            }
            for (asset_id, timestamp), data in updates.items()
        ]

        mode = "snapshot" if write_mode == "snapshot" else "delta"

        if timeframe == const.TF_1T:
            repo.upsert_minute_candles(candles, mode=mode)
        else:
            repo.upsert_aggregated_candles(timeframe, candles, mode=mode)

    def fetch_minute_ids(
        self,
        recent_minute_keys: list[tuple[int, datetime]],
    ) -> dict[tuple[int, datetime], int]:
        """
        Fetch minute candle IDs for given keys.
        
        Note: This is less efficient than the new design which
        doesn't require minute ID tracking.
        """
        if not recent_minute_keys:
            return {}

        from apps.core.models import MinuteCandle

        asset_ids = list({k[0] for k in recent_minute_keys})
        timestamps = [k[1] for k in recent_minute_keys]

        existing = MinuteCandle.objects.filter(
            asset_id__in=asset_ids,
            timestamp__in=timestamps,
        ).values_list("asset_id", "timestamp", "id")

        return {(aid, ts): cid for aid, ts, cid in existing}
