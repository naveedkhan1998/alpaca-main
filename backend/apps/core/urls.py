# urls.py

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BreezeAccountViewSet,
    CandleViewSet,
    InstrumentViewSet,
    SubscribedInstrumentsViewSet,
)

router = DefaultRouter()
router.register(r"breeze", BreezeAccountViewSet, basename="breeze")
router.register(r"instruments", InstrumentViewSet, basename="instruments")
router.register(
    r"subscribed_instruments",
    SubscribedInstrumentsViewSet,
    basename="subscribed_instruments",
)
router.register(r"candles", CandleViewSet, basename="candles")


urlpatterns = [
    path("", include(router.urls)),
]
