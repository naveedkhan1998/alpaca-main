from django.db.models import Q
import django_filters

from apps.core.models import Asset, Candle


class AssetFilter(django_filters.FilterSet):
    """Filter for Asset model using Alpaca data structure"""

    symbol = django_filters.CharFilter(field_name="symbol", lookup_expr="icontains")
    name = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    asset_class = django_filters.ChoiceFilter(
        field_name="asset_class", choices=Asset.ASSET_CLASS_CHOICES
    )
    exchange = django_filters.ChoiceFilter(
        field_name="exchange", choices=Asset.EXCHANGE_CHOICES
    )
    status = django_filters.ChoiceFilter(
        field_name="status", choices=Asset.STATUS_CHOICES
    )
    tradable = django_filters.BooleanFilter(field_name="tradable")
    marginable = django_filters.BooleanFilter(field_name="marginable")
    shortable = django_filters.BooleanFilter(field_name="shortable")
    fractionable = django_filters.BooleanFilter(field_name="fractionable")

    search = django_filters.CharFilter(method="filter_by_search_term")

    class Meta:
        model = Asset
        fields = [
            "symbol",
            "asset_class",
            "exchange",
            "status",
            "tradable",
            "marginable",
            "shortable",
            "fractionable",
        ]

    def filter_by_search_term(self, queryset, name, value):
        """Search across symbol and name fields"""
        if not value:
            return queryset.none()
        return queryset.filter(Q(symbol__icontains=value) | Q(name__icontains=value))


class CandleFilter(django_filters.FilterSet):
    """Filter for Candle model"""

    asset = django_filters.ModelChoiceFilter(queryset=Asset.objects.all())
    symbol = django_filters.CharFilter(field_name="asset__symbol", lookup_expr="iexact")
    timeframe = django_filters.CharFilter(field_name="timeframe", lookup_expr="iexact")

    # Date range filters
    start_date = django_filters.DateTimeFilter(
        field_name="timestamp", lookup_expr="gte"
    )
    end_date = django_filters.DateTimeFilter(field_name="timestamp", lookup_expr="lte")

    # Date filters (for specific dates)
    date = django_filters.DateFilter(field_name="timestamp__date")

    # Price range filters
    min_price = django_filters.NumberFilter(field_name="close", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="close", lookup_expr="lte")

    # Volume filters
    min_volume = django_filters.NumberFilter(field_name="volume", lookup_expr="gte")
    max_volume = django_filters.NumberFilter(field_name="volume", lookup_expr="lte")

    class Meta:
        model = Candle
        fields = ["asset", "timeframe", "is_active"]
