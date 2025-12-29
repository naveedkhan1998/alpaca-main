from django.contrib import admin

from apps.core.models import (
    AggregatedCandle,
    AlpacaAccount,
    Asset,
    Candle,
    MinuteCandle,
    Tick,
    WatchList,
    WatchListAsset,
)


@admin.register(MinuteCandle)
class MinuteCandleAdmin(admin.ModelAdmin):
    """Admin for 1-minute candle data."""

    list_display = ["asset", "timestamp", "open", "high", "low", "close", "volume"]
    list_filter = ["asset__asset_class"]
    search_fields = ["asset__symbol"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["asset"]


@admin.register(AggregatedCandle)
class AggregatedCandleAdmin(admin.ModelAdmin):
    """Admin for aggregated candle data (5T+)."""

    list_display = [
        "asset",
        "timeframe",
        "timestamp",
        "open",
        "high",
        "low",
        "close",
        "volume",
    ]
    list_filter = ["timeframe", "asset__asset_class"]
    search_fields = ["asset__symbol"]
    date_hierarchy = "timestamp"
    ordering = ["-timestamp"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["asset"]


# Register other models
admin.site.register(Tick)
admin.site.register(AlpacaAccount)
admin.site.register(Asset)
admin.site.register(WatchList)
admin.site.register(WatchListAsset)
admin.site.register(Candle)  # Legacy, for migration period
