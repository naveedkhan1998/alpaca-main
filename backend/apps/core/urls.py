# urls.py

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AlpacaAccountViewSet,
    AssetViewSet,
    WatchListViewSet,
    CandleViewSet,
    TickViewSet,
)

router = DefaultRouter()
router.register(r"alpaca", AlpacaAccountViewSet, basename="alpaca")
router.register(r"assets", AssetViewSet, basename="assets")
router.register(r"watchlists", WatchListViewSet, basename="watchlists")
router.register(r"candles", CandleViewSet, basename="candles")
router.register(r"ticks", TickViewSet, basename="ticks")


urlpatterns = [
    path("", include(router.urls)),
]
