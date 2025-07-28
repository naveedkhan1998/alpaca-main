# views.py

import json
import logging

from django.core.cache import cache
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.breeze import breeze_session_manager
from apps.core.filters import InstrumentFilter
from apps.core.models import (
    BreezeAccount,
    Candle,
    Exchanges,
    Instrument,
    PercentageInstrument,
    SubscribedInstruments,
)
from apps.core.pagination import CandleBucketPagination, OffsetPagination
from apps.core.serializers import (
    AggregatedCandleSerializer,
    AllInstrumentSerializer,
    BreezeAccountSerializer,
    CandleSerializer,
    InstrumentSerializer,
    SubscribedSerializer,
)
from apps.core.tasks import (
    load_instrument_candles,
    manual_start_websocket,
    resample_candles,
    websocket_start,
)
from apps.core.utils import resample_qs
from main import const, utils

logger = logging.getLogger(__name__)


class BreezeAccountViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing BreezeAccount instances.
    """

    serializer_class = BreezeAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BreezeAccount.objects.filter(user=self.request.user)

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
            # Check if session-related fields are being updated
            session_fields = ["api_key", "api_secret", "session_token"]
            credentials_updated = any(field in request.data for field in session_fields)

            serializer.save()

            # Clear cached session if credentials were updated
            if credentials_updated:
                breeze_session_manager.clear_session(request.user.id)
                logger.info(
                    f"Cleared cached session for user {request.user.id} due to credential update."
                )
                # Start a new WebSocket session if credentials were updated
                manual_start_websocket.apply_async(args=[request.user.id])

            return Response(
                {"msg": "Account updated successfully", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="breeze_status")
    def get_breeze_status(self, request):
        """
        Retrieves the status of the Breeze session and the WebSocket connection for the authenticated user.

        Returns:
            Response: JSON containing session and WebSocket statuses.
        """
        try:
            user_id = self.request.user.id

            # Initialize BreezeSession (retrieves cached instance or creates a new one)
            session = breeze_session_manager.initialize_session(user_id)

            # Check session status by fetching funds
            check_breeze_session = session.get_funds()
            # Check if ticks have been received in the last 10 seconds
            websocket_status = bool(cache.get(const.WEBSOCKET_HEARTBEAT_KEY, False))

            # Determine session status message
            if check_breeze_session.get("Status") == 200:
                session_status = True
                status_code = status.HTTP_200_OK
            else:
                session_status = False
                status_code = status.HTTP_200_OK
                logger.error(
                    f"Breeze session check failed for user {user_id}: {check_breeze_session}"
                )

            # Construct response data
            response_data = {
                "session_status": session_status,
                "websocket_status": websocket_status,
            }

            # Log the successful status check
            logger.info(f"Breeze status checked for user {user_id}: {response_data}")

            return Response({"msg": "done", "data": response_data}, status=status_code)

        except BreezeAccount.DoesNotExist:
            # Handle case where BreezeAccount does not exist for the user
            logger.warning(
                f"No BreezeAccount found for user ID {self.request.user.id}."
            )
            return Response(
                {
                    "msg": "error",
                    "data": {"session_status": False, "websocket_status": False},
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            # Log the exception with stack trace
            logger.error(
                f"Error in get_breeze_status for user ID {self.request.user.id}: {e}",
                exc_info=True,
            )

            # Return a response indicating failure
            return Response(
                {
                    "msg": "error",
                    "data": {"session_status": False, "websocket_status": False},
                },
                status=status.HTTP_200_OK,
            )

    @action(detail=False, methods=["post"], url_path="websocket_start")
    def start_websocket(self, request):
        try:
            user = self.request.user
            websocket_start.apply_async(args=[user.id])
            return Response(
                {"msg": "WebSocket Started successfully", "data": "WebSocket Started"},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            logger.error(f"Error starting WebSocket: {e}", exc_info=True)
            return Response(
                {
                    "msg": "Error starting WebSocket",
                    "data": "WebSocket could not start",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="refresh_session")
    def refresh_session(self, request):
        """
        Manually refresh the Breeze session for the authenticated user.

        Returns:
            Response: JSON containing the refresh status.
        """
        try:
            user_id = request.user.id

            # Refresh the session (clears old and creates new)
            session = breeze_session_manager.refresh_session(user_id)

            # Test the new session
            check_session = session.get_funds()

            if check_session.get("Status") == 200:
                logger.info(f"Session refreshed successfully for user {user_id}")
                return Response(
                    {
                        "msg": "Session refreshed successfully",
                        "data": {"session_status": True},
                    },
                    status=status.HTTP_200_OK,
                )
            else:
                logger.warning(
                    f"Session refresh failed for user {user_id}: {check_session}"
                )
                return Response(
                    {
                        "msg": "Session refresh failed",
                        "data": {"session_status": False},
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except BreezeAccount.DoesNotExist:
            logger.warning(f"No BreezeAccount found for user ID {request.user.id}.")
            return Response(
                {"msg": "No account found", "data": {"session_status": False}},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(
                f"Error refreshing session for user {request.user.id}: {e}",
                exc_info=True,
            )
            return Response(
                {"msg": "Error refreshing session", "data": {"session_status": False}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class InstrumentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A ViewSet for viewing Instrument instances.
    """

    queryset = Instrument.objects.all()
    serializer_class = AllInstrumentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = InstrumentFilter

    def list(self, request, *args, **kwargs):
        # Validate required parameters
        exchange_param = request.query_params.get("exchange")
        search_param = request.query_params.get("search")

        # Check if exchange is provided
        if not exchange_param:
            return Response(
                {"msg": "Exchange is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if search term is at least 2 characters
        if search_param and len(search_param) < 2:
            return Response(
                {"msg": "Search term must be at least 2 characters long"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate exchange exists
        if not Exchanges.objects.filter(title=exchange_param).last():
            return Response(
                {"msg": "Invalid Exchange"}, status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.filter_queryset(self.get_queryset())

        # Apply the 50-item limit for "FON" exchange if it's part of the filtered queryset
        if exchange_param and exchange_param.upper() == "FON":
            queryset = queryset[:50]

        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {"msg": "Ok", "data": serializer.data}, status=status.HTTP_200_OK
            )

        return Response(
            {"msg": "No instruments found"}, status=status.HTTP_404_NOT_FOUND
        )


class SubscribedInstrumentsViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing SubscribedInstruments instances.
    """

    queryset = SubscribedInstruments.objects.all()
    serializer_class = SubscribedSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OffsetPagination

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {"msg": "success", "data": serializer.data}, status=status.HTTP_200_OK
        )

    def destroy(self, request, pk=None):
        instrument = get_object_or_404(SubscribedInstruments, pk=pk)
        redis_client = utils.get_redis_client("default")
        unsubscription_queue = const.websocket_unsubscription_queue(request.user.id)
        unsubscribed_instrument = {"stock_token": instrument.stock_token}
        redis_client.rpush(unsubscription_queue, json.dumps(unsubscribed_instrument))
        logger.info(
            f"Enqueued unsubscription for instrument ID {pk} with stock token {instrument.stock_token}."
        )

        instrument.delete()
        return Response({"msg": "success"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="subscribe")
    def subscribe(self, request, pk=None):
        instrument = get_object_or_404(Instrument, pk=pk)
        data = InstrumentSerializer(instrument).data
        data.pop("id", None)

        duration = request.data.get("duration")
        exchange_id = data.pop("exchange")

        if SubscribedInstruments.objects.filter(**data).exists():
            return Response(
                {"error": "already subscribed"}, status=status.HTTP_400_BAD_REQUEST
            )

        sub_ins = SubscribedInstruments.objects.create(exchange_id=exchange_id, **data)
        PercentageInstrument.objects.create(instrument=sub_ins)
        load_instrument_candles.delay(sub_ins.id, request.user.id, duration=duration)

        serializer = self.get_serializer(sub_ins)
        return Response(
            {"msg": "success", "data": serializer.data}, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"], url_path="candles")
    def candles(self, request, pk=None):
        """
        Retrives paginated candles for a subscribed instrument.
        The candles are ordered by date in descending order.
        """
        instrument = self.get_object()
        tf = int(request.query_params.get("tf", 1))

        qs = resample_qs(instrument.id, tf)  # as before
        total = qs.aggregate(cnt=Count("bucket", distinct=True))["cnt"]

        paginator = CandleBucketPagination()
        page = paginator.paginate_queryset(qs, request)
        paginator.count = total
        serializer = AggregatedCandleSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class CandleViewSet(viewsets.ViewSet):
    """
    A ViewSet for handling Candle related operations.
    """

    permission_classes = [IsAuthenticated]

    def get_cached_candles(self, instrument_id):
        cache_key = f"candles_{instrument_id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        instrument = get_object_or_404(SubscribedInstruments, id=instrument_id)
        qs = Candle.objects.filter(instrument=instrument).order_by("date")
        data = CandleSerializer(qs, many=True).data

        # Cache for 5 minutes
        cache.set(cache_key, data, 300)
        return data

    @action(detail=False, methods=["get"], url_path="get_candles")
    def get_candles(self, request):
        instrument_id = request.query_params.get("id")
        tf = request.query_params.get("tf")
        if not instrument_id:
            return Response(
                {"msg": "Missing instrument ID"}, status=status.HTTP_400_BAD_REQUEST
            )

        instrument = get_object_or_404(SubscribedInstruments, id=instrument_id)
        qs = Candle.objects.filter(instrument=instrument).order_by("date")

        candles = CandleSerializer(qs, many=True).data

        if tf:
            try:
                timeframe = int(tf)
                new_candles = resample_candles(candles, timeframe)
            except ValueError:
                return Response(
                    {"msg": "Invalid timeframe"}, status=status.HTTP_400_BAD_REQUEST
                )
        else:
            new_candles = candles

        return Response({"msg": "done", "data": new_candles}, status=status.HTTP_200_OK)
