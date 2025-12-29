"""
Asset models for tradable instruments and watchlists.
"""

from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.db.models.functions import Lower

from apps.account.models import User


class Asset(models.Model):
    """
    Alpaca tradable asset (stock, option, or crypto).
    
    Represents an instrument that can be traded through the Alpaca API.
    Supports US equities, options, and cryptocurrencies with their respective
    trading properties and margin requirements.
    
    Attributes:
        alpaca_id: Unique identifier from Alpaca's system.
        symbol: Ticker symbol (e.g., 'AAPL', 'BTC/USD').
        name: Full name of the asset.
        asset_class: Classification (us_equity, us_option, crypto).
        exchange: Trading exchange.
        status: Whether the asset is active for trading.
        tradable: Whether the asset can be traded.
        marginable: Whether margin trading is allowed.
        shortable: Whether short selling is allowed.
        easy_to_borrow: Whether shares are readily available for shorting.
        fractionable: Whether fractional shares are supported.
    
    Indexes:
        - Composite on (symbol, asset_class) for filtered queries
        - GIN trigram indexes on symbol and name for fuzzy search
    """

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
    alpaca_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Alpaca's unique asset identifier",
    )
    symbol = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Ticker symbol",
    )
    name = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Full asset name",
    )
    asset_class = models.CharField(
        max_length=20,
        choices=ASSET_CLASS_CHOICES,
        default="us_equity",
        help_text="Asset classification",
    )
    exchange = models.CharField(
        max_length=20,
        choices=EXCHANGE_CHOICES,
        blank=True,
        null=True,
        help_text="Trading exchange",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        help_text="Whether asset is active for trading",
    )

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
            # Common filters/sorts
            models.Index(fields=["symbol", "asset_class"], name="idx_asset_sym_cls"),
            models.Index(
                fields=["status", "tradable"], name="idx_asset_status_tradable"
            ),
            # Case-insensitive prefix lookups on symbol
            models.Index(Lower("symbol"), name="idx_asset_symbol_lower"),
            # Trigram GIN indexes for fuzzy search (requires pg_trgm extension)
            GinIndex(
                fields=["symbol"],
                name="gin_asset_symbol_trgm",
                opclasses=["gin_trgm_ops"],
            ),
            GinIndex(
                fields=["name"],
                name="gin_asset_name_trgm",
                opclasses=["gin_trgm_ops"],
            ),
        ]
        verbose_name = "Asset"
        verbose_name_plural = "Assets"

    def __str__(self) -> str:
        return f"{self.symbol} ({self.name})"


class WatchList(models.Model):
    """
    User-defined watchlist for organizing assets.
    
    Allows users to create custom lists of assets they want to monitor.
    Supports both user-specific and global (admin) watchlists.
    
    Attributes:
        user: Owner of the watchlist (null for global lists).
        name: Display name for the watchlist.
        description: Optional description.
        is_active: Whether the watchlist is active.
        is_default: Whether this is the user's default watchlist.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        help_text="User who owns this watchlist (null for global)",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "name"]
        verbose_name = "Watch List"
        verbose_name_plural = "Watch Lists"

    def __str__(self) -> str:
        return self.name


class WatchListAsset(models.Model):
    """
    Many-to-many relationship between watchlists and assets.
    
    Tracks which assets are in which watchlists, with metadata
    about when they were added and their active status.
    """

    watchlist = models.ForeignKey(WatchList, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ["watchlist", "asset"]
        verbose_name = "Watch List Asset"
        verbose_name_plural = "Watch List Assets"

    def __str__(self) -> str:
        return f"{self.watchlist.name} - {self.asset.symbol}"
