# views.py

from datetime import datetime, timedelta
import logging

from django.core.cache import cache
from django.db import connection
from django.db.models import Case, Count, IntegerField, Q, When
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.models import (
    AlpacaAccount,
    Asset,
    Candle,
    MinuteCandle,
    AggregatedCandle,
    Tick,
    WatchList,
    WatchListAsset,
)
from apps.core.views.candle_views import (
    get_candles_v3,
    get_estimated_count,
    CandleViewMixin,
)
from apps.core.pagination import CandleBucketPagination, OffsetPagination
from apps.core.serializers import (
    AggregatedCandleSerializer,
    AlpacaAccountSerializer,
    AssetSerializer,
    CandleChartSerializer,
    CandleSerializer,
    TickSerializer,
    WatchListAssetSerializer,
    WatchListCreateSerializer,
    WatchListSerializer,
)
from apps.core.services.alpaca_service import alpaca_service
from apps.core.services.backfill_coordinator import request_backfill
from apps.core.tasks import alpaca_sync_task
from apps.core.utils import get_timeframe

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

            service = alpaca_service

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
            from apps.core.models import SyncStatus

            # Get or create sync status for assets
            sync_status, created = SyncStatus.objects.get_or_create(
                sync_type="assets", defaults={"total_items": 0, "is_syncing": False}
            )

            # Check if already syncing
            if sync_status.is_syncing:
                return Response(
                    {"msg": "Sync already in progress"},
                    status=status.HTTP_409_CONFLICT,
                )

            # Mark as syncing
            sync_status.is_syncing = True
            sync_status.save()

            alpaca_sync_task.delay()
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

    @action(detail=False, methods=["get"], url_path="sync_status")
    def get_sync_status(self, request):
        """
        Get the sync status including last sync time and asset count.
        """
        try:
            from apps.core.models import Asset, SyncStatus

            # Get total asset count
            total_assets = Asset.objects.filter(status="active").count()

            # Get sync status
            sync_status, created = SyncStatus.objects.get_or_create(
                sync_type="assets",
                defaults={"total_items": total_assets, "is_syncing": False},
            )

            # Update total_items if it doesn't match
            if sync_status.total_items != total_assets:
                sync_status.total_items = total_assets
                sync_status.save()

            # Check if sync is needed (no assets or last sync > 1 week ago)
            from datetime import timedelta

            from django.utils import timezone

            needs_sync = False
            if total_assets == 0:
                needs_sync = True
            elif sync_status.last_sync_at:
                one_week_ago = timezone.now() - timedelta(days=7)
                if sync_status.last_sync_at < one_week_ago:
                    needs_sync = True

            return Response(
                {
                    "msg": "Sync status retrieved",
                    "data": {
                        "last_sync_at": sync_status.last_sync_at,
                        "total_assets": total_assets,
                        "needs_sync": needs_sync,
                        "is_syncing": sync_status.is_syncing,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            logger.error(f"Error getting sync status: {e}", exc_info=True)
            return Response(
                {"msg": "Error getting sync status", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AssetViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for viewing Asset instances with optimized filtering and search.
    """

    # Keep base queryset lean; avoid unnecessary select_related/prefetch on Asset
    queryset = Asset.objects.filter(status="active")
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]
    pagination_class = OffsetPagination
    search_fields = ["symbol", "name"]
    ordering_fields = [
        "symbol",
        "name",
        "created_at",
        "asset_class",
        "exchange",
        "tradable",
    ]
    ordering = ["symbol"]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by asset class (support multiple values)
        asset_classes = self.request.query_params.getlist("asset_class")
        if asset_classes:
            queryset = queryset.filter(asset_class__in=asset_classes)

        # Filter by exchange (support multiple values)
        exchanges = self.request.query_params.getlist("exchange")
        if exchanges:
            queryset = queryset.filter(exchange__in=exchanges)

        # Filter by tradable status
        tradable = self.request.query_params.get("tradable")
        if tradable is not None:
            queryset = queryset.filter(tradable=tradable.lower() == "true")

        # Filter by marginable status
        marginable = self.request.query_params.get("marginable")
        if marginable is not None:
            queryset = queryset.filter(marginable=marginable.lower() == "true")

        # Filter by shortable status
        shortable = self.request.query_params.get("shortable")
        if shortable is not None:
            queryset = queryset.filter(shortable=shortable.lower() == "true")

        # Filter by fractionable status
        fractionable = self.request.query_params.get("fractionable")
        if fractionable is not None:
            queryset = queryset.filter(fractionable=fractionable.lower() == "true")

        # Optimized search handling replacing DRF SearchFilter
        search_term = self.request.query_params.get("search", "").strip()
        if search_term:
            base_qs = queryset
            # Prefer symbol prefix for very short queries
            if len(search_term) == 1:
                queryset = base_qs.filter(symbol__istartswith=search_term)
            else:
                queryset = (
                    base_qs.filter(
                        Q(symbol__istartswith=search_term)
                        | Q(symbol__iexact=search_term)
                        | Q(name__icontains=search_term)
                    )
                    .annotate(
                        search_rank=Case(
                            When(symbol__iexact=search_term, then=0),
                            When(symbol__istartswith=search_term, then=1),
                            When(name__istartswith=search_term, then=2),
                            default=3,
                            output_field=IntegerField(),
                        )
                    )
                    .order_by("search_rank", "symbol")
                )

                # Refine ordering with trigram similarity if extension available
                try:
                    with connection.cursor() as cur:
                        cur.execute(
                            "SELECT extname FROM pg_extension WHERE extname='pg_trgm'"
                        )
                        if cur.fetchone():
                            queryset = queryset.extra(
                                select={
                                    "sym_sim": "similarity(symbol, %s)",
                                    "name_sim": "similarity(coalesce(name,''), %s)",
                                },
                                select_params=[search_term, search_term],
                            ).order_by("search_rank", "-sym_sim", "-name_sim", "symbol")
                except Exception:
                    pass

        return queryset

    def list(self, request, *args, **kwargs):
        """
        List all assets with pagination and caching.
        """
        cache_key = f"assets_list_{hash(str(sorted(request.query_params.items())))}"
        if not any(
            param in request.query_params for param in ["limit", "offset", "ordering"]
        ):
            cached_result = cache.get(cache_key)
            if cached_result:
                return Response(cached_result)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data).data
            if len(serializer.data) <= 100:
                cache.set(cache_key, response_data, 300)
            return Response(response_data)

        serializer = self.get_serializer(queryset, many=True)
        response_data = {
            "msg": "Assets retrieved successfully",
            "data": serializer.data,
            "count": len(serializer.data),
        }
        cache.set(cache_key, response_data, 300)
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="search")
    def search_assets(self, request):
        """
        Optimized search assets by symbol or name with pagination and caching.
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

        # Cache search results
        cache_key = f"asset_search_{search_term.lower()}_{request.query_params.get('limit', 50)}_{request.query_params.get('offset', 0)}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result)

        base_qs = self.get_queryset()

        # Prefer fast prefix search on lower(symbol) if the user is typing a ticker
        # Use icontains as fallback on name; both backed by trigram GIN if available
        # Rank results to show best matches first
        queryset = (
            base_qs.filter(
                Q(symbol__istartswith=search_term)
                | Q(symbol__iexact=search_term)
                | Q(name__icontains=search_term)
            )
            .annotate(
                search_rank=Case(
                    When(symbol__iexact=search_term, then=0),
                    When(symbol__istartswith=search_term, then=1),
                    When(name__istartswith=search_term, then=2),
                    default=3,
                    output_field=IntegerField(),
                )
            )
            .order_by("search_rank", "symbol")
        )

        # If pg_trgm is available, optionally boost by similarity for short queries
        try:
            with connection.cursor() as cur:
                cur.execute("SELECT extname FROM pg_extension WHERE extname='pg_trgm'")
                if cur.fetchone():
                    # Use similarity via raw extra ordering to refine ordering
                    # Note: we don't filter by similarity threshold to keep results inclusive
                    queryset = queryset.extra(
                        select={
                            "sym_sim": "similarity(symbol, %s)",
                            "name_sim": "similarity(coalesce(name,''), %s)",
                        },
                        select_params=[search_term, search_term],
                    ).order_by("search_rank", "-sym_sim", "-name_sim", "symbol")
        except Exception:
            # If extension check fails, continue with default queryset
            pass

        # Apply pagination to search results
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data).data
            cache.set(cache_key, response_data, 180)  # 3 minutes
            return Response(response_data)

        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            response_data = {
                "msg": "Assets found",
                "data": serializer.data,
                "count": len(serializer.data),
            }
            cache.set(cache_key, response_data, 180)
            return Response(response_data, status=status.HTTP_200_OK)

        return Response(
            {"msg": "No assets found", "data": [], "count": 0},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="stats")
    def get_stats(self, request):
        """
        Get asset statistics for filter options.
        """
        cache_key = "asset_stats"
        cached_stats = cache.get(cache_key)
        if cached_stats:
            return Response(cached_stats)

        queryset = self.get_queryset()

        # Get asset class counts
        asset_class_stats = (
            queryset.values("asset_class")
            .annotate(count=Count("id"))
            .order_by("asset_class")
        )

        # Get exchange counts
        exchange_stats = (
            queryset.values("exchange").annotate(count=Count("id")).order_by("exchange")
        )

        asset_class_choices = dict(Asset.ASSET_CLASS_CHOICES)
        exchange_choices = dict(Asset.EXCHANGE_CHOICES)

        stats = {
            "asset_classes": [
                {
                    "value": stat["asset_class"],
                    "label": asset_class_choices.get(
                        stat["asset_class"], stat["asset_class"]
                    ),
                    "count": stat["count"],
                }
                for stat in asset_class_stats
            ],
            "exchanges": [
                {
                    "value": stat["exchange"],
                    "label": exchange_choices.get(stat["exchange"], stat["exchange"]),
                    "count": stat["count"],
                }
                for stat in exchange_stats
                if stat["exchange"]  # Filter out null exchanges
            ],
            "total_count": queryset.count(),
        }

        # Cache for 30 minutes
        cache.set(cache_key, stats, 1800)
        return Response(stats)

    @action(detail=True, methods=["get"], url_path="candles_v2")
    def candles_v2(self, request, pk=None):
        """
        Legacy candle endpoint with offset pagination.

        Deprecated: Use candles_v3 for better performance with cursor pagination.
        """
        asset = self.get_object()
        tf_minutes = get_timeframe(request)
        offset = int(request.query_params.get("offset", 0))
        limit = int(request.query_params.get("limit", 1000))

        # Map minutes to stored timeframe labels using shared const
        from main import const as _const

        minutes_to_tf = {
            1: _const.TF_1T,
            5: _const.TF_5T,
            15: _const.TF_15T,
            30: _const.TF_30T,
            60: _const.TF_1H,
            240: _const.TF_4H,
            1440: _const.TF_1D,
        }
        tf_label = minutes_to_tf.get(tf_minutes)
        if not tf_label:
            return Response(
                {
                    "msg": "Unsupported timeframe",
                    "supported": list(minutes_to_tf.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use new models with fallback to legacy
        if tf_label == _const.TF_1T:
            base_qs = MinuteCandle.objects.filter(asset_id=asset.id)
        else:
            base_qs = AggregatedCandle.objects.filter(
                asset_id=asset.id, timeframe=tf_label
            )

        # Use estimated count to avoid COUNT(*) overhead
        from apps.core.views.candle_views import get_estimated_count

        total = get_estimated_count(asset.id, tf_label)

        candles_qs = base_qs.order_by("-timestamp")[offset : offset + limit]
        rows = [
            {
                "bucket": c.timestamp,
                "o": float(c.open),
                "h_": float(c.high),
                "l_": float(c.low),
                "c": float(c.close),
                "v_": float(c.volume),
            }
            for c in candles_qs
        ]
        serializer = AggregatedCandleSerializer(rows, many=True)

        has_next = total > (offset + limit)
        has_previous = offset > 0
        return Response(
            {
                "results": serializer.data,
                "count": total,
                "next": has_next,
                "previous": has_previous,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="candles_v3")
    def candles_v3(self, request, pk=None):
        """
        Optimized candle endpoint with Redis caching and cursor pagination.

        Query Parameters:
            timeframe: Candle timeframe in minutes (1, 5, 15, 30, 60, 240, 1440).
            limit: Maximum candles to return (default 1000, max 5000).
            cursor: ISO 8601 timestamp for pagination.
            cache: Whether to use cache (default "true").

        Returns:
            {
                "results": [...],
                "next_cursor": "2024-01-15T09:00:00+00:00",
                "has_next": true,
                "cached": false
            }
        """
        return get_candles_v3(self, request, pk)


class WatchListViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing WatchList instances.
    """

    serializer_class = WatchListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OffsetPagination

    def get_queryset(self):
        # Include both default watchlists and user-specific watchlists
        return WatchList.objects.filter(
            Q(user=self.request.user) | Q(user=None),
            is_active=True,
        )

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

        # Idempotent backfill schedule via coordinator (deduped per-asset across processes)
        request_backfill(watchlist_asset.asset.id, source="watchlist.add_asset")

        if not created and not watchlist_asset.is_active:
            watchlist_asset.is_active = True
            watchlist_asset.save()
            created = True

        if created:
            serializer = WatchListAssetSerializer(watchlist_asset)
            logger.info(
                f"Asset {asset.symbol} added to watchlist {watchlist.name}. Historical data fetch triggered."
            )
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

        # only allow removing from user-owned watchlists or admin
        if request.user != watchlist.user and not request.user.is_staff:
            return Response(
                {"msg": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

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
        from main import const as _const

        timeframe = request.query_params.get("timeframe", _const.TF_1D)
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
