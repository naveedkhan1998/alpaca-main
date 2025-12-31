"""
Tick model for real-time trade data.
"""

from django.db import models


class Tick(models.Model):
    """
    Real-time tick/trade data from Alpaca stream.

    Represents individual trade executions received via WebSocket.
    Used for aggregating into 1-minute candles and for high-frequency
    analysis when needed.

    Attributes:
        asset: The asset this tick is for.
        alpaca_trade_id: Alpaca's unique trade identifier.
        exchange_code: Exchange where the trade occurred.
        price: Trade price.
        size: Trade size (shares/units).
        conditions: Trade condition flags from exchange.
        tape: Tape indicator for equities.
        timestamp: When the trade occurred.
        received_at: When we received this tick.
        used: Whether this tick has been processed into a candle.

    Note:
        Ticks are typically short-lived and can be pruned after
        aggregation into minute candles.
    """

    asset = models.ForeignKey(
        "core.Asset",
        on_delete=models.CASCADE,
        help_text="Asset this tick is for",
    )

    # Alpaca trade fields
    alpaca_trade_id = models.BigIntegerField(
        blank=True,
        null=True,
        help_text="Alpaca's unique trade ID ('i' field)",
    )
    exchange_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Exchange code ('x' field)",
    )
    price = models.FloatField(help_text="Trade price ('p' field)")
    size = models.IntegerField(
        blank=True,
        null=True,
        help_text="Trade size ('s' field)",
    )
    conditions = models.JSONField(
        blank=True,
        null=True,
        help_text="Trade conditions ('c' field)",
    )
    tape = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Tape indicator ('z' field)",
    )

    timestamp = models.DateTimeField(help_text="Trade timestamp ('t' field)")
    received_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(
        default=False,
        help_text="Whether this tick has been aggregated into a candle",
    )

    class Meta:
        indexes = [
            models.Index(fields=["asset", "-timestamp"]),
            models.Index(fields=["timestamp"]),
            # Index for filtering unused ticks in cleanup/aggregation tasks
            models.Index(fields=["used", "timestamp"], name="idx_tick_used_ts"),
        ]
        verbose_name = "Tick"
        verbose_name_plural = "Ticks"

    def __str__(self) -> str:
        return (
            f"Name:{self.asset.symbol}| Price:{self.price} | TimeStamp:{self.timestamp}"
        )
