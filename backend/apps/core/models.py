from django.contrib.postgres.indexes import BrinIndex
from django.db import models

from apps.account.models import User

# Create your models here.


class AlpacaAccount(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)
    name = models.CharField(default="ADMIN", max_length=255)
    api_key = models.CharField(default=" ", max_length=255)
    api_secret = models.CharField(default=" ", max_length=255)
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name


class Asset(models.Model):
    """Model representing an Alpaca asset/instrument"""

    ASSET_CLASS_CHOICES = [
        ("us_equity", "US Equity"),
        ("us_option", "US Option"),
        ("crypto", "Cryptocurrency"),
    ]

    EXCHANGE_CHOICES = [
        ("AMEX", "American Stock Exchange"),
        ("ARCA", "NYSE Arca"),
        ("BATS", "BATS Global Markets"),
        ("NYSE", "New York Stock Exchange"),
        ("NASDAQ", "NASDAQ"),
        ("NYSEARCA", "NYSE Arca"),
        ("OTC", "Over-the-Counter"),
        ("CRYPTO", "Cryptocurrency Exchange"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    # Core Alpaca asset fields
    alpaca_id = models.CharField(max_length=255, unique=True)  # Alpaca's asset ID
    symbol = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=500, blank=True, null=True)
    asset_class = models.CharField(
        max_length=20, choices=ASSET_CLASS_CHOICES, default="us_equity"
    )
    exchange = models.CharField(
        max_length=20, choices=EXCHANGE_CHOICES, blank=True, null=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    # Trading properties
    tradable = models.BooleanField(default=False)
    marginable = models.BooleanField(default=False)
    shortable = models.BooleanField(default=False)
    easy_to_borrow = models.BooleanField(default=False)
    fractionable = models.BooleanField(default=False)

    # Margin requirements
    maintenance_margin_requirement = models.FloatField(blank=True, null=True)
    margin_requirement_long = models.CharField(max_length=10, blank=True, null=True)
    margin_requirement_short = models.CharField(max_length=10, blank=True, null=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["symbol", "asset_class"]),
            models.Index(fields=["status", "tradable"]),
        ]

    def __str__(self):
        return f"{self.symbol} ({self.name})"


class WatchList(models.Model):
    """Model for organizing assets into watchlists"""

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "name"]

    def __str__(self):
        return f"{self.user.email} - {self.name}"


class WatchListAsset(models.Model):
    """Many-to-many relationship between watchlists and assets"""

    watchlist = models.ForeignKey(WatchList, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["watchlist", "asset"]

    def __str__(self):
        return f"{self.watchlist.name} - {self.asset.symbol}"


class Tick(models.Model):
    """Real-time tick data from Alpaca stream"""

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)

    # Alpaca trade fields
    alpaca_trade_id = models.BigIntegerField(blank=True, null=True)  # 'i' field
    exchange_code = models.CharField(max_length=10, blank=True, null=True)  # 'x' field
    price = models.FloatField()  # 'p' field (ltp)
    size = models.IntegerField(blank=True, null=True)  # 's' field
    conditions = models.JSONField(blank=True, null=True)  # 'c' field
    tape = models.CharField(max_length=10, blank=True, null=True)  # 'z' field

    timestamp = models.DateTimeField()  # 't' field
    received_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["asset", "-timestamp"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self) -> str:
        return (
            f"Name:{self.asset.symbol}| Price:{self.price} | TimeStamp:{self.timestamp}"
        )


class Candle(models.Model):
    """Historical OHLCV candle data from Alpaca

    For timeframes greater than 1 minute, `minute_candle_ids` contains the list of
    1-minute candle primary keys that make up this aggregated candle. For 1T rows,
    this field is typically null.
    """

    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)

    # OHLCV data
    open = models.FloatField()
    high = models.FloatField()
    low = models.FloatField()
    close = models.FloatField()
    volume = models.BigIntegerField()

    # Additional Alpaca fields
    trade_count = models.IntegerField(blank=True, null=True)  # 'n' field
    vwap = models.FloatField(
        blank=True, null=True
    )  # 'vw' field (volume weighted average price)

    # Timeframe and timestamp
    timeframe = models.CharField(max_length=10, default="1T")  # e.g., '1D', '1H', '5T'
    timestamp = models.DateTimeField()  # 't' field

    # Aggregation linkage (for TF > 1T)
    minute_candle_ids = models.JSONField(blank=True, null=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

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

    def __str__(self):
        return (
            f"{self.asset.symbol} {self.timeframe} {self.timestamp} "
            f"O:{self.open} H:{self.high} L:{self.low} C:{self.close}"
        )
