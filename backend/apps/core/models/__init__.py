"""
Core models for the Alpaca trading platform.

This module provides the data models for assets, candles, ticks, and related entities.
The candle storage is optimized for high-frequency writes and fast reads with:
- Separate tables for minute candles (high volume) and aggregated candles (lower volume)
- DecimalField for financial precision
- PostgreSQL-native upserts via raw SQL
- Proper indexing strategies (BRIN for time-series, composite for queries)
"""

from apps.core.models.assets import Asset, WatchList, WatchListAsset
from apps.core.models.base import AlpacaAccount, SyncStatus
from apps.core.models.candles import (
    AggregatedCandle,
    BaseCandleMixin,
    Candle,  # Legacy model for backward compatibility
    MinuteCandle,
)
from apps.core.models.data_refresh import DataRefreshBatch, DataRefreshTask
from apps.core.models.ticks import Tick
from main.const import AGGREGATED_TIMEFRAME_CHOICES, TIMEFRAME_CHOICES

__all__ = [
    # Base models
    "SyncStatus",
    "AlpacaAccount",
    # Asset models
    "Asset",
    "WatchList",
    "WatchListAsset",
    # Tick models
    "Tick",
    # Candle models
    "BaseCandleMixin",
    "MinuteCandle",
    "AggregatedCandle",
    "Candle",  # Legacy
    "TIMEFRAME_CHOICES",
    "AGGREGATED_TIMEFRAME_CHOICES",
    # Data refresh tracking
    "DataRefreshBatch",
    "DataRefreshTask",
]
