"""
API views for candle data with cursor-based pagination and compression.

This module provides optimized endpoints for retrieving candle data:
- Cursor-based pagination (no COUNT(*) overhead)
- Compact array format (60% smaller than object format)
- GZip compression via middleware
- Optimized DB queries using .values()

Response Format (Compact):
-------------------------
Instead of verbose object format:
    {"timestamp": "...", "open": "1.23", "high": "1.24", ...}
    
Uses compact array format:
    ["timestamp", "open", "high", "low", "close", "volume", "trade_count", "vwap"]
    
This reduces JSON payload by ~60%.

Usage:
------
    GET /api/assets/{id}/candles_v3/?format=compact  (default, recommended)
    GET /api/assets/{id}/candles_v3/?format=object   (legacy verbose format)
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from django.db import connection
from rest_framework import status
from rest_framework.response import Response

from apps.core.models import MinuteCandle, AggregatedCandle, Asset
from main import const

logger = logging.getLogger(__name__)

# Map minutes to timeframe labels
MINUTES_TO_TF = {
    1: const.TF_1T,
    5: const.TF_5T,
    15: const.TF_15T,
    30: const.TF_30T,
    60: const.TF_1H,
    240: const.TF_4H,
    1440: const.TF_1D,
}

# Fields to fetch from DB - only what we need
CANDLE_FIELDS = ("timestamp", "open", "high", "low", "close", "volume", "trade_count", "vwap")


class CandleViewMixin:
    """
    Mixin providing optimized candle retrieval methods.
    
    Add this to any ViewSet that needs candle data access.
    Provides cursor pagination, compact format, and efficient queries.
    """

    def _get_candles_response(
        self,
        asset: Asset,
        timeframe: str,
        *,
        limit: int = 1000,
        cursor: str | None = None,
        compact: bool = True,
    ) -> Response:
        """
        Get candles with cursor-based pagination and optional compact format.
        
        Args:
            asset: The Asset model instance.
            timeframe: Candle timeframe (1T, 5T, 15T, 30T, 1H, 4H, 1D).
            limit: Maximum number of candles to return.
            cursor: ISO timestamp cursor for pagination.
            compact: If True, returns array format. If False, object format.
        
        Returns:
            Response with candle data and pagination info.
        
        Compact Format:
            When compact=True (default), returns candles as arrays:
            {
                "columns": ["timestamp", "open", "high", "low", "close", "volume", "trade_count", "vwap"],
                "results": [
                    ["2024-01-15T09:30:00+00:00", "150.25", "150.50", "150.00", "150.40", "1000", 50, "150.30"],
                    ...
                ]
            }
            This reduces payload size by ~60%.
        """
        asset_id = asset.id

        # Parse cursor if provided
        cursor_dt = None
        if cursor:
            try:
                cursor_dt = datetime.fromisoformat(cursor.replace("Z", "+00:00"))
            except ValueError:
                return Response(
                    {"error": "Invalid cursor format. Use ISO 8601 timestamp."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Query from database using .values() for efficiency
        candles = self._query_candles_values(
            asset_id=asset_id,
            timeframe=timeframe,
            limit=limit + 1,  # Fetch one extra to determine has_next
            cursor_dt=cursor_dt,
        )

        # Determine if there's a next page
        has_next = len(candles) > limit
        if has_next:
            candles = candles[:limit]

        # Determine next cursor from last candle
        next_cursor = None
        if has_next and candles:
            last_ts = candles[-1]["timestamp"]
            next_cursor = last_ts.isoformat() if hasattr(last_ts, "isoformat") else str(last_ts)

        # Build response based on format
        if compact:
            # Compact array format - ~60% smaller
            results = [self._candle_to_array(c) for c in candles]
            return Response({
                "columns": list(CANDLE_FIELDS),
                "results": results,
                "next_cursor": next_cursor,
                "has_next": has_next,
            })
        else:
            # Legacy object format
            results = [self._candle_to_dict(c) for c in candles]
            return Response({
                "results": results,
                "next_cursor": next_cursor,
                "has_next": has_next,
            })

    def _query_candles_values(
        self,
        asset_id: int,
        timeframe: str,
        limit: int,
        cursor_dt: datetime | None = None,
    ) -> list[dict]:
        """
        Query candles using .values() for reduced DB→Python transfer.
        
        Using .values() instead of full model instances reduces:
        - Memory usage (no model instantiation overhead)
        - Data transfer (only selected columns)
        - Serialization time (already dict format)
        
        Args:
            asset_id: Asset ID.
            timeframe: Candle timeframe.
            limit: Maximum records to return.
            cursor_dt: Cursor timestamp for pagination.
        
        Returns:
            List of candle dicts with only required fields.
        """
        if timeframe == const.TF_1T:
            qs = MinuteCandle.objects.filter(asset_id=asset_id)
        else:
            qs = AggregatedCandle.objects.filter(
                asset_id=asset_id,
                timeframe=timeframe,
            )

        # Apply cursor filter
        if cursor_dt:
            qs = qs.filter(timestamp__lt=cursor_dt)

        # Use .values() to get only needed fields as dicts
        # This is more efficient than fetching full model instances
        return list(
            qs.order_by("-timestamp")
            .values(*CANDLE_FIELDS)[:limit]
        )

    def _candle_to_array(self, candle: dict) -> list:
        """
        Convert candle dict to compact array format.
        
        Array order matches CANDLE_FIELDS:
        [timestamp, open, high, low, close, volume, trade_count, vwap]
        """
        ts = candle["timestamp"]
        return [
            ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
            str(candle["open"]),
            str(candle["high"]),
            str(candle["low"]),
            str(candle["close"]),
            str(candle["volume"]),
            candle["trade_count"],
            str(candle["vwap"]) if candle["vwap"] else None,
        ]

    def _candle_to_dict(self, candle: dict) -> dict:
        """Convert candle values dict to serialized dict format."""
        ts = candle["timestamp"]
        return {
            "timestamp": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
            "open": str(candle["open"]),
            "high": str(candle["high"]),
            "low": str(candle["low"]),
            "close": str(candle["close"]),
            "volume": str(candle["volume"]),
            "trade_count": candle["trade_count"],
            "vwap": str(candle["vwap"]) if candle["vwap"] else None,
        }


def get_candles_v3(viewset, request, pk=None) -> Response:
    """
    Optimized candle retrieval endpoint with cursor pagination and compression.
    
    Query Parameters:
        timeframe: Candle timeframe in minutes (1, 5, 15, 30, 60, 240, 1440).
                  Defaults to 1 (1-minute).
        limit: Maximum candles to return. Defaults to 1000, max 5000.
        cursor: ISO 8601 timestamp for cursor-based pagination.
                Returns candles with timestamp < cursor.
        format: Response format - "compact" (default) or "object".
                Compact format reduces payload by ~60%.
    
    Compact Response Format:
        {
            "columns": ["timestamp", "open", "high", "low", "close", "volume", "trade_count", "vwap"],
            "results": [
                ["2024-01-15T09:30:00+00:00", "150.25", "150.50", ...],
                ...
            ],
            "next_cursor": "2024-01-15T09:00:00+00:00",
            "has_next": true
        }
    
    Object Response Format (format=object):
        {
            "results": [{"timestamp": "...", "open": "...", ...}],
            "next_cursor": "...",
            "has_next": true
        }
    """
    asset = viewset.get_object()

    # Parse timeframe
    try:
        tf_minutes = int(request.query_params.get("timeframe", 1))
    except ValueError:
        return Response(
            {"error": "timeframe must be an integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    tf_label = MINUTES_TO_TF.get(tf_minutes)
    if not tf_label:
        return Response(
            {
                "error": "Unsupported timeframe",
                "supported": list(MINUTES_TO_TF.keys()),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Parse limit
    try:
        limit = min(int(request.query_params.get("limit", 1000)), 5000)
    except ValueError:
        limit = 1000

    # Parse cursor
    cursor = request.query_params.get("cursor")

    # Parse format (compact is default for efficiency)
    format_param = request.query_params.get("format", "compact").lower()
    compact = format_param != "object"

    # Use mixin method
    mixin = CandleViewMixin()
    return mixin._get_candles_response(
        asset=asset,
        timeframe=tf_label,
        limit=limit,
        cursor=cursor,
        compact=compact,
    )


def get_estimated_count(asset_id: int, timeframe: str) -> int:
    """
    Get estimated count of candles using PostgreSQL statistics.
    
    Much faster than COUNT(*) for large tables. Uses pg_class.reltuples
    with a filter estimation based on the query.
    
    Note:
        This is an approximation. For exact counts, use COUNT(*)
        but be aware of performance implications.
    """
    # Get table name based on timeframe
    table = "core_minute_candle" if timeframe == const.TF_1T else "core_aggregated_candle"

    # Use a fast estimation query
    sql = """
        SELECT COALESCE(
            (SELECT reltuples::bigint FROM pg_class WHERE relname = %s),
            0
        ) AS estimated_rows
    """

    try:
        with connection.cursor() as cur:
            cur.execute(sql, [table])
            result = cur.fetchone()
            total_rows = result[0] if result else 0

            # For aggregated candles, divide by number of timeframes (rough estimate)
            if timeframe != const.TF_1T:
                total_rows = total_rows // 6  # 6 aggregated timeframes

            return total_rows

    except Exception as e:
        logger.warning(f"Failed to get estimated count: {e}")
        return 0
