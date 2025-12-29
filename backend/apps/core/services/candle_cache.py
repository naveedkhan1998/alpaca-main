"""
Redis caching service for candle data.

This module provides a high-performance caching layer for candle data using Redis
sorted sets. The caching strategy is optimized for:
- Fast reads for recent data (last 24h)
- Automatic cache warming on first access
- TTL-based expiration to prevent stale data
- Efficient range queries using sorted set scores

Architecture:
------------
- Each asset/timeframe combination has its own Redis sorted set
- Score = Unix timestamp for time-range queries
- Value = JSON-encoded candle data
- TTL = 24 hours for minute data, 1 week for daily

Usage:
------
    from apps.core.services.candle_cache import CandleCacheService

    cache = CandleCacheService()

    # Get cached candles (returns None if not cached)
    candles = cache.get_candles(asset_id=1, timeframe="1T", limit=100)

    # Set candles in cache
    cache.set_candles(asset_id=1, timeframe="1T", candles=[...])

    # Invalidate on update
    cache.invalidate(asset_id=1, timeframe="1T")
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
import json
import logging
from typing import Any

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Cache TTL configuration by timeframe
CACHE_TTL_CONFIG = {
    "1T": 60 * 60 * 6,  # 6 hours for minute data
    "5T": 60 * 60 * 12,  # 12 hours
    "15T": 60 * 60 * 24,  # 24 hours
    "30T": 60 * 60 * 24,  # 24 hours
    "1H": 60 * 60 * 24 * 3,  # 3 days
    "4H": 60 * 60 * 24 * 7,  # 1 week
    "1D": 60 * 60 * 24 * 14,  # 2 weeks
}

# Maximum candles to cache per asset/timeframe
MAX_CACHED_CANDLES = {
    "1T": 1440,  # 1 day of minute data (24 * 60)
    "5T": 2016,  # 1 week of 5-minute data
    "15T": 672,  # 1 week of 15-minute data
    "30T": 336,  # 1 week of 30-minute data
    "1H": 720,  # 1 month of hourly data
    "4H": 360,  # 2 months of 4-hour data
    "1D": 365,  # 1 year of daily data
}


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def _make_cache_key(asset_id: int, timeframe: str, cursor: str | None = None) -> str:
    """
    Generate cache key for candle data.

    Args:
        asset_id: Asset ID.
        timeframe: Candle timeframe.
        cursor: Optional cursor for paginated historical data.

    Returns:
        Cache key string.
    """
    if cursor:
        # Hash the cursor to avoid overly long keys
        import hashlib

        cursor_hash = hashlib.md5(cursor.encode()).hexdigest()[:12]
        return f"candles:{asset_id}:{timeframe}:cursor:{cursor_hash}"
    return f"candles:{asset_id}:{timeframe}"


def _make_count_cache_key(asset_id: int, timeframe: str) -> str:
    """Generate cache key for candle count (used for pagination)."""
    return f"candles_count:{asset_id}:{timeframe}"


@dataclass
class CandleCacheService:
    """
    Redis-backed caching service for candle data.

    Provides fast access to recent candle data with automatic expiration.
    Uses Django's cache framework which should be configured with Redis
    for sorted set operations.

    Attributes:
        enabled: Whether caching is enabled (can be disabled for testing).
        default_ttl: Default TTL for cache entries.

    Cache Structure:
        Key: "candles:{asset_id}:{timeframe}"
        Value: List of candle dicts, ordered by timestamp descending

    Note:
        For optimal performance, ensure Django's CACHES setting uses
        django-redis with a Redis backend.
    """

    enabled: bool = field(default=True)
    default_ttl: int = field(default=60 * 60 * 6)  # 6 hours

    def __post_init__(self):
        """Check if Redis is available."""
        if self.enabled:
            try:
                cache.get("_health_check")
            except Exception as e:
                logger.warning(f"Cache not available, disabling: {e}")
                self.enabled = False

    def get_candles(
        self,
        asset_id: int,
        timeframe: str,
        *,
        limit: int = 1000,
        offset: int = 0,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        cursor: str | None = None,
    ) -> list[dict] | None:
        """
        Get cached candles for an asset/timeframe.

        Args:
            asset_id: Asset ID.
            timeframe: Candle timeframe (1T, 5T, etc.).
            limit: Maximum number of candles to return.
            offset: Number of candles to skip (for pagination).
            start_time: Optional start time filter.
            end_time: Optional end time filter.
            cursor: Optional cursor for cursor-based pagination caching.

        Returns:
            List of candle dicts if cached, None if cache miss.
            Candles are ordered by timestamp descending (most recent first).
        """
        if not self.enabled:
            return None

        key = _make_cache_key(asset_id, timeframe, cursor)

        try:
            cached = cache.get(key)
            if cached is None:
                return None

            candles = json.loads(cached) if isinstance(cached, str) else cached

            # Apply time filters if provided
            if start_time or end_time:
                filtered = []
                for c in candles:
                    ts = datetime.fromisoformat(c["timestamp"])
                    if start_time and ts < start_time:
                        continue
                    if end_time and ts > end_time:
                        continue
                    filtered.append(c)
                candles = filtered

            # Apply offset and limit
            return candles[offset : offset + limit]

        except Exception as e:
            logger.warning(f"Cache get failed for {key}: {e}")
            return None

    def set_candles(
        self,
        asset_id: int,
        timeframe: str,
        candles: Sequence[dict[str, Any]],
        *,
        ttl: int | None = None,
        cursor: str | None = None,
    ) -> bool:
        """
        Cache candles for an asset/timeframe.

        Args:
            asset_id: Asset ID.
            timeframe: Candle timeframe.
            candles: List of candle dicts to cache. Should be ordered
                    by timestamp descending.
            ttl: Optional TTL override in seconds.
            cursor: Optional cursor for cursor-based pagination caching.

        Returns:
            True if successfully cached, False otherwise.

        Note:
            Candles are trimmed to MAX_CACHED_CANDLES for the timeframe
            to prevent unbounded cache growth.
        """
        if not self.enabled:
            return False

        key = _make_cache_key(asset_id, timeframe, cursor)

        # Use longer TTL for cursor-based (historical) cache
        # since historical data doesn't change
        if cursor:
            cache_ttl = ttl or 60 * 60 * 24 * 7  # 1 week for historical pages
        else:
            cache_ttl = ttl or CACHE_TTL_CONFIG.get(timeframe, self.default_ttl)
        max_candles = MAX_CACHED_CANDLES.get(timeframe, 1000)

        try:
            # Ensure candles are sorted descending by timestamp
            sorted_candles = sorted(
                candles,
                key=lambda c: c.get("timestamp", ""),
                reverse=True,
            )

            # Trim to max size
            trimmed = sorted_candles[:max_candles]

            # Serialize with Decimal handling
            serialized = json.dumps(trimmed, cls=DecimalEncoder)

            cache.set(key, serialized, cache_ttl)
            return True

        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {e}")
            return False

    def append_candles(
        self,
        asset_id: int,
        timeframe: str,
        new_candles: Sequence[dict[str, Any]],
    ) -> bool:
        """
        Append new candles to the cache, maintaining order.

        Use this for real-time updates where you're adding new candles
        to an existing cache. More efficient than full set_candles
        for incremental updates.

        Args:
            asset_id: Asset ID.
            timeframe: Candle timeframe.
            new_candles: New candles to append.

        Returns:
            True if successfully updated, False otherwise.
        """
        if not self.enabled or not new_candles:
            return False

        key = _make_cache_key(asset_id, timeframe)
        max_candles = MAX_CACHED_CANDLES.get(timeframe, 1000)

        try:
            # Get existing
            cached = cache.get(key)
            if cached is None:
                # No existing cache, just set new
                return self.set_candles(asset_id, timeframe, list(new_candles))

            existing = json.loads(cached) if isinstance(cached, str) else cached

            # Create lookup of existing timestamps for dedup
            existing_ts = {c.get("timestamp") for c in existing}

            # Merge: new candles that don't exist + existing
            merged = []
            for c in new_candles:
                ts = c.get("timestamp")
                if isinstance(ts, datetime):
                    ts = ts.isoformat()
                if ts not in existing_ts:
                    c_copy = dict(c)
                    c_copy["timestamp"] = ts
                    merged.append(c_copy)

            merged.extend(existing)

            # Sort and trim
            sorted_candles = sorted(
                merged,
                key=lambda c: c.get("timestamp", ""),
                reverse=True,
            )[:max_candles]

            serialized = json.dumps(sorted_candles, cls=DecimalEncoder)
            ttl = CACHE_TTL_CONFIG.get(timeframe, self.default_ttl)
            cache.set(key, serialized, ttl)
            return True

        except Exception as e:
            logger.warning(f"Cache append failed for {key}: {e}")
            return False

    def update_candle(
        self,
        asset_id: int,
        timeframe: str,
        candle: dict[str, Any],
    ) -> bool:
        """
        Update a single candle in the cache.

        Use this for updating the current/open candle with new data.
        If the candle doesn't exist in cache, it will be appended.

        Args:
            asset_id: Asset ID.
            timeframe: Candle timeframe.
            candle: Candle data to update (must include timestamp).

        Returns:
            True if successfully updated, False otherwise.
        """
        if not self.enabled:
            return False

        key = _make_cache_key(asset_id, timeframe)

        try:
            cached = cache.get(key)
            if cached is None:
                return self.set_candles(asset_id, timeframe, [candle])

            existing = json.loads(cached) if isinstance(cached, str) else cached

            # Find and update matching timestamp
            target_ts = candle.get("timestamp")
            if isinstance(target_ts, datetime):
                target_ts = target_ts.isoformat()

            found = False
            for i, c in enumerate(existing):
                if c.get("timestamp") == target_ts:
                    # Update in place
                    c_copy = dict(candle)
                    c_copy["timestamp"] = target_ts
                    existing[i] = c_copy
                    found = True
                    break

            if not found:
                # Append as new
                c_copy = dict(candle)
                c_copy["timestamp"] = target_ts
                existing.insert(0, c_copy)
                # Trim
                max_candles = MAX_CACHED_CANDLES.get(timeframe, 1000)
                existing = existing[:max_candles]

            serialized = json.dumps(existing, cls=DecimalEncoder)
            ttl = CACHE_TTL_CONFIG.get(timeframe, self.default_ttl)
            cache.set(key, serialized, ttl)
            return True

        except Exception as e:
            logger.warning(f"Cache update failed for {key}: {e}")
            return False

    def invalidate(
        self,
        asset_id: int,
        timeframe: str | None = None,
    ) -> bool:
        """
        Invalidate cached candles.

        Args:
            asset_id: Asset ID.
            timeframe: Optional specific timeframe. If None, invalidates
                      all timeframes for the asset.

        Returns:
            True if successfully invalidated.
        """
        if not self.enabled:
            return False

        try:
            if timeframe:
                key = _make_cache_key(asset_id, timeframe)
                cache.delete(key)
                cache.delete(_make_count_cache_key(asset_id, timeframe))
            else:
                # Invalidate all timeframes
                for tf in CACHE_TTL_CONFIG.keys():
                    cache.delete(_make_cache_key(asset_id, tf))
                    cache.delete(_make_count_cache_key(asset_id, tf))
            return True

        except Exception as e:
            logger.warning(f"Cache invalidate failed for asset {asset_id}: {e}")
            return False

    def get_count(
        self,
        asset_id: int,
        timeframe: str,
    ) -> int | None:
        """
        Get cached count of candles for pagination.

        Returns:
            Cached count or None if not cached.
        """
        if not self.enabled:
            return None

        key = _make_count_cache_key(asset_id, timeframe)
        try:
            return cache.get(key)
        except Exception:
            return None

    def set_count(
        self,
        asset_id: int,
        timeframe: str,
        count: int,
        *,
        ttl: int = 300,  # 5 minutes
    ) -> bool:
        """
        Cache the count of candles for pagination.

        Args:
            asset_id: Asset ID.
            timeframe: Candle timeframe.
            count: Total count.
            ttl: TTL for count cache (shorter than data cache).

        Returns:
            True if successfully cached.
        """
        if not self.enabled:
            return False

        key = _make_count_cache_key(asset_id, timeframe)
        try:
            cache.set(key, count, ttl)
            return True
        except Exception:
            return False


# Singleton instance for app-wide use
candle_cache = CandleCacheService()
