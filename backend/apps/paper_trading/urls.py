from rest_framework.routers import DefaultRouter

from .views import PaperTradeViewSet

router = DefaultRouter()
router.register(r"trades", PaperTradeViewSet, basename="paper-trades")

urlpatterns = router.urls
