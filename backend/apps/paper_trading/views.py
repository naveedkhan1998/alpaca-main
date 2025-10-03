from decimal import Decimal
import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PaperTrade
from .serializers import PaperTradeCloseSerializer, PaperTradeSerializer

logger = logging.getLogger(__name__)


class PaperTradeViewSet(viewsets.ModelViewSet):
    serializer_class = PaperTradeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ["entry_at", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = PaperTrade.objects.filter(user=self.request.user)
        asset_id = self.request.query_params.get("asset")
        status_param = self.request.query_params.get("status")
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        price = self.request.query_params.get("current_price")
        if price:
            try:
                ctx["current_price"] = Decimal(price)
            except Exception:
                logger.warning(f"Invalid current_price parameter: {price}")
        return ctx

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="close", url_name="close")
    def close_trade(self, request, pk=None):
        trade: PaperTrade = self.get_object()
        if not trade.is_open:
            return Response(
                {"detail": "Trade is not open."}, status=status.HTTP_400_BAD_REQUEST
            )
        serializer = PaperTradeCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.update(trade, serializer.validated_data)
        return Response(
            PaperTradeSerializer(trade, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel_trade(self, request, pk=None):
        trade: PaperTrade = self.get_object()
        if not trade.is_open:
            return Response(
                {"detail": "Only open trades can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        trade.status = PaperTrade.Status.CANCELLED
        trade.exit_at = timezone.now()
        if note := request.data.get("notes"):
            trade.notes = note
        trade.save(update_fields=["status", "exit_at", "notes", "updated_at"])
        return Response(
            PaperTradeSerializer(trade, context=self.get_serializer_context()).data
        )
