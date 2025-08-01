# views.py

import json
import logging
from datetime import datetime, timedelta

from django.core.cache import cache
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import (
    AlpacaAccount,
    Asset,
    WatchList,
    WatchListAsset,
    Candle,
    Tick,
)
from apps.core.pagination import CandleBucketPagination, OffsetPagination
from apps.core.serializers import (
    AlpacaAccountSerializer,
    AssetSerializer,
    AssetSearchSerializer,
    WatchListSerializer,
    WatchListCreateSerializer,
    WatchListAssetSerializer,
    CandleSerializer,
    CandleChartSerializer,
    TickSerializer,
    AggregatedCandleSerializer,
)
from apps.core.services.alpaca_service import AlpacaService
from apps.core.tasks import alpaca_sync_task, start_alpaca_stream, fetch_historical_data

logger = logging.getLogger(__name__)


class AlpacaAccountViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing AlpacaAccount instances.
    """

    serializer_class = AlpacaAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return AlpacaAccount.objects.filter(user=self.request.user)

    def list(self, request):
        queryset = self.get_queryset()
        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {"msg": "Okay", "data": serializer.data}, status=status.HTTP_200_OK
            )
        return Response({"msg": "No accounts found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                {"msg": "Account created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        instance = get_object_or_404(self.get_queryset(), pk=pk)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"msg": "Account updated successfully", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="alpaca_status")
    def get_alpaca_status(self, request):
        """
        Test Alpaca API connection and return status.
        """
        try:
            account = self.get_queryset().filter(is_active=True).first()
            if not account:
                return Response(
                    {
                        "msg": "No active Alpaca account found",
                        "data": {"connection_status": False},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            service = AlpacaService(
                api_key=account.api_key,
                secret_key=account.api_secret,
            )

            # Test connection by fetching a small number of assets
            try:
                assets = service.list_assets(status="active", fallback_symbols=["AAPL"])
                connection_status = len(assets) > 0
            except Exception as e:
                logger.error(f"Alpaca API test failed: {e}")
                connection_status = False

            return Response(
                {
                    "msg": "Status checked",
                    "data": {"connection_status": connection_status},
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error checking Alpaca status: {e}", exc_info=True)
            return Response(
                {
                    "msg": "Error checking status",
                    "data": {"connection_status": False},
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="sync_assets")
    def sync_assets(self, request):
        """
        Sync assets from Alpaca API to local database.
        """
        try:
            account = self.get_queryset().filter(is_active=True).first()
            if not account:
                return Response(
                    {"msg": "No active Alpaca account found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            alpaca_sync_task.delay(account.id)
            return Response(
                {
                    "msg": "Assets synced started successfully",
                    "data": "Syncing in progress. You can check the status later.",
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error syncing assets: {e}", exc_info=True)
            return Response(
                {"msg": "Error syncing assets", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="start_stream")
    def start_stream(self, request):
        """
        Start Alpaca streaming for user's watchlists.
        """
        try:
            account = self.get_queryset().filter(is_active=True).first()
            if not account:
                return Response(
                    {"msg": "No active Alpaca account found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Get symbols from user's watchlists
            symbols = list(
                WatchListAsset.objects.filter(
                    watchlist__user=request.user, is_active=True
                ).values_list("asset__symbol", flat=True)
            )

            if not symbols:
                return Response(
                    {"msg": "No assets in watchlists to stream"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Start streaming task
            start_alpaca_stream.delay(account.id, symbols)

            return Response(
                {"msg": "Streaming started successfully", "data": {"symbols": symbols}},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error starting stream: {e}", exc_info=True)
            return Response(
                {"msg": "Error starting stream", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssetViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for viewing Asset instances.
    """

    queryset = Asset.objects.filter(status="active")
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    pagination_class = OffsetPagination
    search_fields = ["symbol", "name"]
    ordering_fields = ["symbol", "name", "created_at"]
    ordering = ["symbol"]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset class
        asset_class = self.request.query_params.get("asset_class")
        if asset_class:
            queryset = queryset.filter(asset_class=asset_class)

        # Filter by exchange
        exchange = self.request.query_params.get("exchange")
        if exchange:
            queryset = queryset.filter(exchange=exchange)

        # Filter by tradable status
        tradable = self.request.query_params.get("tradable")
        if tradable is not None:
            queryset = queryset.filter(tradable=tradable.lower() == "true")

        return queryset

    @action(detail=False, methods=["get"], url_path="search")
    def search_assets(self, request):
        """
        Search assets by symbol or name with minimum 2 character requirement.
        """
        search_term = request.query_params.get("q", "").strip()

        if not search_term:
            return Response(
                {"msg": "Search term is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        if len(search_term) < 2:
            return Response(
                {"msg": "Search term must be at least 2 characters long"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(
            Q(symbol__icontains=search_term) | Q(name__icontains=search_term)
        )[
            :50
        ]  # Limit results

        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {"msg": "Ok", "data": serializer.data}, status=status.HTTP_200_OK
            )

        return Response({"msg": "No assets found"}, status=status.HTTP_404_NOT_FOUND)


class WatchListViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing WatchList instances.
    """

    serializer_class = WatchListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OffsetPagination

    def get_queryset(self):
        return WatchList.objects.filter(user=self.request.user, is_active=True)

    def get_serializer_class(self):
        if self.action == "create":
            return WatchListCreateSerializer
        return WatchListSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(
                {"msg": "Watchlist created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="add_asset")
    def add_asset(self, request, pk=None):
        """
        Add an asset to a watchlist.
        """
        watchlist = self.get_object()
        asset_id = request.data.get("asset_id")

        if not asset_id:
            return Response(
                {"msg": "Asset ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            asset = Asset.objects.get(pk=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {"msg": "Asset not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        watchlist_asset, created = WatchListAsset.objects.get_or_create(
            watchlist=watchlist, asset=asset, defaults={"is_active": True}
        )
        fetch_historical_data.delay(watchlist_asset.id)
        if not created and not watchlist_asset.is_active:
            watchlist_asset.is_active = True
            watchlist_asset.save()
            created = True

        if created:
            serializer = WatchListAssetSerializer(watchlist_asset)
            return Response(
                {"msg": "Asset added to watchlist", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                {"msg": "Asset already in watchlist"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(
        detail=True, methods=["delete"], url_path="remove_asset/(?P<asset_id>[^/.]+)"
    )
    def remove_asset(self, request, pk=None, asset_id=None):
        """
        Remove an asset from a watchlist.
        """
        watchlist = self.get_object()

        try:
            watchlist_asset = WatchListAsset.objects.get(
                watchlist=watchlist, asset_id=asset_id, is_active=True
            )
            watchlist_asset.is_active = False
            watchlist_asset.save()

            return Response(
                {"msg": "Asset removed from watchlist"},
                status=status.HTTP_200_OK,
            )
        except WatchListAsset.DoesNotExist:
            return Response(
                {"msg": "Asset not found in watchlist"},
                status=status.HTTP_404_NOT_FOUND,
            )


class CandleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for viewing Candle instances.
    """

    queryset = Candle.objects.filter(is_active=True)
    serializer_class = CandleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CandleBucketPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset
        asset_id = self.request.query_params.get("asset_id")
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter by symbol
        symbol = self.request.query_params.get("symbol")
        if symbol:
            queryset = queryset.filter(asset__symbol=symbol)

        # Filter by timeframe
        timeframe = self.request.query_params.get("timeframe")
        if timeframe:
            queryset = queryset.filter(timeframe=timeframe)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
                queryset = queryset.filter(timestamp__gte=start)
            except ValueError:
                pass

        if end_date:
            try:
                end = datetime.fromisoformat(end_date)
                queryset = queryset.filter(timestamp__lte=end)
            except ValueError:
                pass

        return queryset.order_by("-timestamp")

    @action(detail=False, methods=["get"], url_path="chart")
    def get_chart_data(self, request):
        """
        Get chart data for a specific asset.
        """
        symbol = request.query_params.get("symbol")
        timeframe = request.query_params.get("timeframe", "1D")
        days = int(request.query_params.get("days", 30))

        if not symbol:
            return Response(
                {"msg": "Symbol is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            asset = Asset.objects.get(symbol=symbol)
        except Asset.DoesNotExist:
            return Response(
                {"msg": "Asset not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get candles for the specified period
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        queryset = Candle.objects.filter(
            asset=asset,
            timeframe=timeframe,
            timestamp__gte=start_date,
            timestamp__lte=end_date,
            is_active=True,
        ).order_by("timestamp")

        serializer = CandleChartSerializer(queryset, many=True)
        return Response(
            {"msg": "Chart data retrieved", "data": serializer.data},
            status=status.HTTP_200_OK,
        )


class TickViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for viewing Tick instances.
    """

    queryset = Tick.objects.all()
    serializer_class = TickSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OffsetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset
        asset_id = self.request.query_params.get("asset_id")
        if asset_id:
            queryset = queryset.filter(asset_id=asset_id)

        # Filter by symbol
        symbol = self.request.query_params.get("symbol")
        if symbol:
            queryset = queryset.filter(asset__symbol=symbol)

        return queryset.order_by("-timestamp")
