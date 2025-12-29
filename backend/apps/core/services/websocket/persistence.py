from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Any, Sequence, TYPE_CHECKING

from apps.core.services.candle_cache import candle_cache
from main import const

if TYPE_CHECKING:
    from apps.core.services.candle_repository import CandleRepository as CandleRepoType


@dataclass
class CandlePersistence:
    """
    Unified persistence layer for candle data.

    Wraps the CandleRepository and integrates with the cache layer
    for real-time updates. This is the primary interface for the
    WebSocket client and aggregator.

    Features:
    - PostgreSQL upserts for high-performance writes
    - Automatic cache invalidation on writes
    - Support for both minute and aggregated candles

    Example:
        >>> persistence = CandlePersistence()
        >>> persistence.upsert_minutes([
        ...     {"asset_id": 1, "timestamp": dt, "open": "150.25", ...}
        ... ])
    """

    _repo: "CandleRepoType | None" = field(default=None, repr=False)

    @property
    def repo(self) -> "CandleRepoType":
        """Lazy-initialize the repository."""
        if self._repo is None:
            from apps.core.services.candle_repository import CandleRepository

            self._repo = CandleRepository()
        return self._repo

    def upsert_minutes(
        self,
        candles: Sequence[dict[str, Any]],
        *,
        mode: str = "delta",
    ) -> int:
        """
        Upsert 1-minute candles.

        Args:
            candles: List of candle dicts with asset_id, timestamp, OHLCV.
            mode: "delta" adds volume, "snapshot" replaces.

        Returns:
            Number of rows affected.
        """
        if not candles:
            return 0

        affected = self.repo.upsert_minute_candles(candles, mode=mode)

        # Invalidate cache for affected assets
        asset_ids = {c["asset_id"] for c in candles}
        for aid in asset_ids:
            candle_cache.invalidate(aid, const.TF_1T)

        return affected

    def upsert_aggregated(
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
            candles: List of candle dicts.
            mode: "snapshot" for aggregated (default).

        Returns:
            Number of rows affected.
        """
        if not candles:
            return 0

        affected = self.repo.upsert_aggregated_candles(timeframe, candles, mode=mode)

        # Invalidate cache for affected assets
        asset_ids = {c["asset_id"] for c in candles}
        for aid in asset_ids:
            candle_cache.invalidate(aid, timeframe)

        return affected

    def bulk_insert_minutes(
        self,
        candles: Sequence[dict[str, Any]],
        *,
        ignore_conflicts: bool = True,
    ) -> int:
        """
        Bulk insert minute candles (no update on conflict).

        Use for historical backfill where data is known to be new.

        Args:
            candles: List of candle dicts.
            ignore_conflicts: Whether to skip duplicates silently.

        Returns:
            Number of rows inserted.
        """
        if not candles:
            return 0

        inserted = self.repo.bulk_insert_minute_candles(
            candles, ignore_conflicts=ignore_conflicts
        )

        # Invalidate cache
        asset_ids = {c["asset_id"] for c in candles}
        for aid in asset_ids:
            candle_cache.invalidate(aid, const.TF_1T)

        return inserted

    def aggregate_to_timeframe(
        self,
        asset_id: int,
        timeframe: str,
        start: datetime,
        end: datetime,
    ) -> int:
        """
        Aggregate minute candles to a higher timeframe using SQL.

        Args:
            asset_id: Asset to aggregate for.
            timeframe: Target timeframe.
            start: Start of aggregation window.
            end: End of aggregation window.

        Returns:
            Number of aggregated candles created/updated.
        """
        affected = self.repo.aggregate_to_timeframe(asset_id, timeframe, start, end)

        # Invalidate cache
        candle_cache.invalidate(asset_id, timeframe)

        return affected


# Legacy compatibility - alias for old imports
CandleRepository = CandlePersistence


@dataclass
class LegacyCandleRepository:
    """
    Backward-compatible repository matching the old interface.

    This is provided for gradual migration. New code should use
    CandlePersistence directly.

    DEPRECATED: Will be removed in a future release.
    """

    _persistence: CandlePersistence | None = None

    @property
    def persistence(self) -> CandlePersistence:
        """Lazy-initialize."""
        if self._persistence is None:
            self._persistence = CandlePersistence()
        return self._persistence

    def save_candles(
        self,
        timeframe: str,
        updates: dict[tuple[int, datetime], dict[str, Any]],
        *,
        write_mode: str = "delta",
        logger=None,
    ) -> None:
        """
        Legacy method matching old interface.

        Converts dict-keyed format to list format and delegates.
        """
        if not updates:
            return

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
            self.persistence.upsert_minutes(candles, mode=mode)
        else:
            self.persistence.upsert_aggregated(timeframe, candles, mode=mode)

        if logger:
            logger.debug("Saved %d %s candles", len(candles), timeframe)

    def fetch_minute_ids(
        self,
        recent_minute_keys: list[tuple[int, datetime]],
    ) -> dict[tuple[int, datetime], int]:
        """
        Fetch minute candle IDs for given keys.

        Note: This is less efficient than the new design which
        doesn't require minute ID tracking. Consider removing
        minute_candle_ids usage from higher-TF candles.
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
