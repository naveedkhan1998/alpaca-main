from django.db.models import Q
import django_filters

from apps.core.models import Instrument


class InstrumentFilter(django_filters.FilterSet):
    exchange = django_filters.CharFilter(
        field_name="exchange__title", lookup_expr="iexact"
    )
    search = django_filters.CharFilter(method="filter_by_search_term")
    option_type = django_filters.CharFilter(
        field_name="option_type", lookup_expr="iexact"
    )
    strike_price = django_filters.NumberFilter(
        field_name="strike_price", lookup_expr="exact"
    )
    expiry_after = django_filters.DateFilter(field_name="expiry", lookup_expr="gte")
    expiry_before = django_filters.DateFilter(field_name="expiry", lookup_expr="lte")

    class Meta:
        model = Instrument
        fields = ["exchange", "option_type", "strike_price", "expiry"]

    def filter_by_search_term(self, queryset, name, value):
        if not value:
            return queryset.none()
        return queryset.filter(
            Q(short_name__icontains=value)
            | Q(company_name__icontains=value)
            | Q(instrument__icontains=value)
            | Q(token__icontains=value)
            | Q(exchange_code__icontains=value)
        )
