# core/serializers.py

from rest_framework import serializers

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


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            "id",
            "alpaca_id",
            "symbol",
            "name",
            "asset_class",
            "exchange",
            "status",
            "tradable",
            "marginable",
            "shortable",
            "easy_to_borrow",
            "fractionable",
            "maintenance_margin_requirement",
            "margin_requirement_long",
            "margin_requirement_short",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class WatchListAssetSerializer(serializers.ModelSerializer):
    asset = AssetSerializer(read_only=True)
    asset_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = WatchListAsset
        fields = ["id", "asset", "asset_id", "added_at", "is_active"]
        read_only_fields = ["id", "added_at"]


class WatchListSerializer(serializers.ModelSerializer):
    assets = WatchListAssetSerializer(
        source="watchlistasset_set", many=True, read_only=True
    )
    asset_count = serializers.SerializerMethodField()

    class Meta:
        model = WatchList
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
            "assets",
            "asset_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "user"]

    def get_asset_count(self, obj):
        return obj.watchlistasset_set.filter(is_active=True).count()


class WatchListCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WatchList
        fields = ["id", "name", "description", "is_active"]
        read_only_fields = ["id"]


class TickSerializer(serializers.ModelSerializer):
    asset_symbol = serializers.CharField(source="asset.symbol", read_only=True)

    class Meta:
        model = Tick
        fields = [
            "id",
            "asset",
            "asset_symbol",
            "alpaca_trade_id",
            "exchange_code",
            "price",
            "size",
            "conditions",
            "tape",
            "timestamp",
            "received_at",
            "used",
        ]
        read_only_fields = ["id", "received_at"]


class CandleSerializer(serializers.ModelSerializer):
    """Serializer for legacy Candle model."""

    asset_symbol = serializers.CharField(source="asset.symbol", read_only=True)

    class Meta:
        model = Candle
        fields = [
            "id",
            "asset",
            "asset_symbol",
            "open",
            "high",
            "low",
            "close",
            "volume",
            "trade_count",
            "vwap",
            "timeframe",
            "timestamp",
            "created_at",
            "is_active",
        ]
        read_only_fields = ["id", "created_at"]


class MinuteCandleSerializer(serializers.ModelSerializer):
    """Serializer for 1-minute candle data."""

    asset_symbol = serializers.CharField(source="asset.symbol", read_only=True)

    class Meta:
        model = MinuteCandle
        fields = [
            "id",
            "asset",
            "asset_symbol",
            "open",
            "high",
            "low",
            "close",
            "volume",
            "trade_count",
            "vwap",
            "timestamp",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AggregatedCandleModelSerializer(serializers.ModelSerializer):
    """Serializer for aggregated candle model data."""

    asset_symbol = serializers.CharField(source="asset.symbol", read_only=True)

    class Meta:
        model = AggregatedCandle
        fields = [
            "id",
            "asset",
            "asset_symbol",
            "timeframe",
            "open",
            "high",
            "low",
            "close",
            "volume",
            "trade_count",
            "vwap",
            "timestamp",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AlpacaAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlpacaAccount
        fields = ["id", "name", "api_key", "api_secret", "last_updated", "is_active"]
        extra_kwargs = {"api_secret": {"write_only": True}}


class CandleChartSerializer(serializers.ModelSerializer):
    """Simplified serializer for chart data (legacy)."""

    class Meta:
        model = Candle
        fields = ["open", "high", "low", "close", "volume", "timestamp"]


class CandleV3Serializer(serializers.Serializer):
    """
    Lightweight serializer for new candle API (v3).

    Uses Serializer instead of ModelSerializer for performance
    when working with pre-computed dictionaries.
    """

    timestamp = serializers.CharField()
    open = serializers.CharField()
    high = serializers.CharField()
    low = serializers.CharField()
    close = serializers.CharField()
    volume = serializers.CharField()
    trade_count = serializers.IntegerField(allow_null=True, required=False)
    vwap = serializers.CharField(allow_null=True, required=False)


class AggregatedCandleSerializer(serializers.Serializer):
    """For aggregated candle data from database queries (legacy v2 format)."""

    date = serializers.DateTimeField(source="bucket")
    open = serializers.FloatField(source="o")
    high = serializers.FloatField(source="h_")
    low = serializers.FloatField(source="l_")
    close = serializers.FloatField(source="c")
    volume = serializers.FloatField(source="v_")


class AssetSearchSerializer(serializers.Serializer):
    """For asset search functionality"""

    symbol = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=500, required=False)
    asset_class = serializers.CharField(max_length=20, required=False)
    exchange = serializers.CharField(max_length=20, required=False)
