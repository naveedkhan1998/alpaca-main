from django.contrib import admin

from apps.core.models import (
    Candle,
    AlpacaAccount,
    Asset,
    WatchList,
    WatchListAsset,
    Tick,
)

# Register your models here.


admin.site.register(Tick)
admin.site.register(AlpacaAccount)
admin.site.register(Asset)
admin.site.register(WatchList)
admin.site.register(WatchListAsset)
admin.site.register(Candle)
