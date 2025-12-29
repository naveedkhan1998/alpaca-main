"""
Candle models for OHLCV data storage.

This module implements an optimized candle storage strategy with:
- Separate tables for minute (1T) and aggregated (5T+) candles
- DecimalField for financial precision
- Optimized indexes for time-series queries
- Support for PostgreSQL-native upserts

Design Rationale:
-----------------
1. **Separate Tables**: 1-minute candles vastly outnumber higher timeframes.
   Separating them allows for:
   - Better index efficiency (no timeframe discriminator needed for MinuteCandle)
   - Easier partitioning strategies (e.g., by month for minute data)
   - Simpler maintenance and archival

2. **DecimalField**: IEEE 754 floats cannot exactly represent decimal values
   (e.g., $123.45), leading to rounding errors. DecimalField stores exact
   decimal values, critical for financial calculations.

3. **No JSONField for minute IDs**: The previous design stored constituent
   1T candle IDs in a JSON array on aggregated candles. This is removed because:
   - JSON parsing overhead on every read
   - Cannot efficiently query reverse relationships
   - Growing array sizes (390+ for daily candles)
   Instead, minute-to-aggregate relationships can be reconstructed via timestamps.
"""

from decimal import Decimal

from django.contrib.postgres.indexes import BrinIndex
from django.db import models

from main.const import AGGREGATED_TIMEFRAME_CHOICES


class BaseCandleMixin(models.Model):
    """
    Abstract base mixin for OHLCV candle data.

    Provides the common fields for all candle types with proper
    decimal precision for financial data.

    Attributes:
        open: Opening price of the candle period.
        high: Highest price during the candle period.
        low: Lowest price during the candle period.
        close: Closing price of the candle period.
        volume: Total volume traded during the period.
        trade_count: Number of trades (optional, from Alpaca).
        vwap: Volume-weighted average price (optional, from Alpaca).
        timestamp: Start time of the candle period.
        created_at: When this record was created.

    Note:
        DecimalField with max_digits=18, decimal_places=8 supports:
        - Prices up to $9,999,999,999.99999999
        - Crypto fractional volumes down to 0.00000001
    """

    # OHLCV data with financial precision
    open = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Opening price",
    )
    high = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Highest price during period",
    )
    low = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Lowest price during period",
    )
    close = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        help_text="Closing price",
    )
    volume = models.DecimalField(
        max_digits=24,
        decimal_places=8,
        default=Decimal("0"),
        help_text="Total volume traded (supports crypto fractional volumes)",
    )

    # Additional Alpaca fields
    trade_count = models.IntegerField(
        blank=True,
        null=True,
        help_text="Number of trades during period ('n' field)",
    )
    vwap = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        blank=True,
        null=True,
        help_text="Volume-weighted average price ('vw' field)",
    )

    # Timestamp
    timestamp = models.DateTimeField(
        help_text="Start time of the candle period",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True

    def to_dict(self) -> dict:
        """Convert candle to dictionary for serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "open": str(self.open),
            "high": str(self.high),
            "low": str(self.low),
            "close": str(self.close),
            "volume": str(self.volume),
            "trade_count": self.trade_count,
            "vwap": str(self.vwap) if self.vwap else None,
        }


class MinuteCandle(BaseCandleMixin):
    """
    1-minute OHLCV candle data.

    This is the highest resolution candle data stored. Higher timeframe
    candles are aggregated from these. Designed for high-volume writes
    from real-time data streams.

    Table Design:
    - Optimized for append-heavy workloads (BRIN index on timestamp)
    - Composite unique constraint prevents duplicates
    - Descending timestamp index for "most recent first" queries

    Example:
        >>> candle = MinuteCandle.objects.create(
        ...     asset=asset,
        ...     timestamp=datetime(2024, 1, 15, 9, 30, tzinfo=timezone.utc),
        ...     open=Decimal("150.25"),
        ...     high=Decimal("150.50"),
        ...     low=Decimal("150.00"),
        ...     close=Decimal("150.35"),
        ...     volume=Decimal("10000"),
        ... )
    """

    asset = models.ForeignKey(
        "core.Asset",
        on_delete=models.CASCADE,
        db_index=True,
        help_text="Asset this candle is for",
    )

    class Meta:
        indexes = [
            # Primary query pattern: asset + time range, newest first
            models.Index(
                fields=["asset", "-timestamp"],
                name="idx_m1_asset_time_desc",
            ),
            # BRIN index for time-series efficiency on append-only data
            BrinIndex(
                fields=["timestamp"],
                name="brin_m1_timestamp",
            ),
        ]
        # Prevent duplicate candles for same asset/timestamp
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "timestamp"],
                name="uq_m1_asset_timestamp",
            ),
        ]
        ordering = ["timestamp"]
        verbose_name = "Minute Candle"
        verbose_name_plural = "Minute Candles"
        # Separate table name for clarity
        db_table = "core_minute_candle"

    def __str__(self) -> str:
        return (
            f"{self.asset.symbol} 1T {self.timestamp} "
            f"O:{self.open} H:{self.high} L:{self.low} C:{self.close}"
        )


class AggregatedCandle(BaseCandleMixin):
    """
    Aggregated OHLCV candle data for timeframes > 1 minute.

    Stores pre-computed aggregations for 5T, 15T, 30T, 1H, 4H, and 1D
    timeframes. These are materialized from MinuteCandle data for fast reads.

    Table Design:
    - Separate from MinuteCandle to avoid index bloat
    - Timeframe discriminator for different aggregation levels
    - Lower volume than minute data, optimized for read-heavy workloads

    Aggregation:
    - Open: First 1T open in the period
    - High: Maximum of all 1T highs
    - Low: Minimum of all 1T lows
    - Close: Last 1T close in the period
    - Volume: Sum of all 1T volumes

    Example:
        >>> candle = AggregatedCandle.objects.create(
        ...     asset=asset,
        ...     timeframe="1H",
        ...     timestamp=datetime(2024, 1, 15, 9, 0, tzinfo=timezone.utc),
        ...     open=Decimal("150.25"),
        ...     high=Decimal("152.00"),
        ...     low=Decimal("149.50"),
        ...     close=Decimal("151.75"),
        ...     volume=Decimal("500000"),
        ... )
    """

    asset = models.ForeignKey(
        "core.Asset",
        on_delete=models.CASCADE,
        db_index=True,
        help_text="Asset this candle is for",
    )
    timeframe = models.CharField(
        max_length=5,
        choices=AGGREGATED_TIMEFRAME_CHOICES,
        db_index=True,
        help_text="Aggregation timeframe (5T, 15T, 30T, 1H, 4H, 1D)",
    )

    class Meta:
        indexes = [
            # Primary query pattern: asset + timeframe + time range
            models.Index(
                fields=["asset", "timeframe", "-timestamp"],
                name="idx_agg_asset_tf_time_desc",
            ),
            # BRIN for time-series queries across all data
            BrinIndex(
                fields=["timestamp"],
                name="brin_agg_timestamp",
            ),
        ]
        # Prevent duplicate candles for same asset/timeframe/timestamp
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "timeframe", "timestamp"],
                name="uq_agg_asset_tf_timestamp",
            ),
        ]
        ordering = ["timestamp"]
        verbose_name = "Aggregated Candle"
        verbose_name_plural = "Aggregated Candles"
        # Separate table name for clarity
        db_table = "core_aggregated_candle"

    def __str__(self) -> str:
        return (
            f"{self.asset.symbol} {self.timeframe} {self.timestamp} "
            f"O:{self.open} H:{self.high} L:{self.low} C:{self.close}"
        )


# Backward compatibility alias for existing code that imports Candle
# TODO: Remove after migration is complete
class Candle(BaseCandleMixin):
    """
    DEPRECATED: Legacy candle model.

    This model is kept for backward compatibility during the migration.
    New code should use MinuteCandle for 1T data and AggregatedCandle
    for higher timeframes.

    Will be removed in a future release.
    """

    asset = models.ForeignKey(
        "core.Asset",
        on_delete=models.CASCADE,
    )
    timeframe = models.CharField(max_length=10, default="1T")
    is_active = models.BooleanField(default=True)
    minute_candle_ids = models.JSONField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["asset", "timeframe", "-timestamp"],
                name="idx_candle_asset_tf_time_desc",
            ),
            BrinIndex(
                fields=["timestamp"],
                name="brin_candle_timestamp",
            ),
        ]
        unique_together = ["asset", "timeframe", "timestamp"]
        ordering = ["timestamp"]
        db_table = "core_candle"

    def __str__(self) -> str:
        return (
            f"{self.asset.symbol} {self.timeframe} {self.timestamp} "
            f"O:{self.open} H:{self.high} L:{self.low} C:{self.close}"
        )
