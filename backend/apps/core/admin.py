from django.contrib import admin

from apps.core.models import (
    BreezeAccount,
    Candle,
    Exchanges,
    Instrument,
    Percentage,
    PercentageInstrument,
    SubscribedInstruments,
    Tick,
)

# Register your models here.


class InstrumentAdmin(admin.ModelAdmin):
    search_fields = [
        "short_name",
        "strike_price",
        "option_type",
        "exchange_code",
        "series",
    ]
    # search_fields = ['short_name']


admin.site.register(Tick)
admin.site.register(Exchanges)
admin.site.register(Instrument, InstrumentAdmin)
admin.site.register(BreezeAccount)
admin.site.register(SubscribedInstruments)
admin.site.register(Candle)
admin.site.register(Percentage)
admin.site.register(PercentageInstrument)
