from django.contrib import admin

from apps.core.models import (
    AlpacaAccount,
    Asset,
    Candle,
    Tick,
    WatchList,
    WatchListAsset,
)

# Register your models here.


admin.site.register(Tick)
admin.site.register(AlpacaAccount)
admin.site.register(Asset)
admin.site.register(WatchList)
admin.site.register(WatchListAsset)
admin.site.register(Candle)
