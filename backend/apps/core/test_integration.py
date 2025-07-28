from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.models import Exchanges, Instrument, SubscribedInstruments

User = get_user_model()


@pytest.fixture
def user():
    return User.objects.create_user(
        email="test@example.com", name="Test User", password="password123"
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def exchange():
    return Exchanges.objects.create(title="NSE")


@pytest.fixture
def instrument(exchange):
    return Instrument.objects.create(
        exchange=exchange,
        token="12345",
        instrument="FUTSTK",
        short_name="Test Instrument",
        series="EQ",
        company_name="Test Company",
        expiry="2025-12-31",
        strike_price=100.0,
        option_type="CE",
        exchange_code="NSE_FO",
    )


@pytest.fixture
def subscribed_instrument(instrument):
    return SubscribedInstruments.objects.create(
        exchange=instrument.exchange,
        token=instrument.token,
        instrument=instrument.instrument,
        short_name=instrument.short_name,
        series=instrument.series,
        company_name=instrument.company_name,
        expiry=instrument.expiry,
        strike_price=instrument.strike_price,
        option_type=instrument.option_type,
        exchange_code=instrument.exchange_code,
    )


@pytest.mark.django_db
class TestSubscribedInstrumentsViewSet:

    def test_list_subscribed_instruments(
        self, authenticated_client, subscribed_instrument
    ):
        response = authenticated_client.get("/api/core/subscribed_instruments/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1

    def test_destroy_subscribed_instrument(
        self, authenticated_client, subscribed_instrument
    ):
        with patch("apps.core.views.utils.get_redis_client") as mock_get_redis_client:
            mock_redis_client = MagicMock()
            mock_get_redis_client.return_value = mock_redis_client
            response = authenticated_client.delete(
                f"/api/core/subscribed_instruments/{subscribed_instrument.pk}/"
            )
            assert response.status_code == status.HTTP_200_OK
            assert SubscribedInstruments.objects.count() == 0

    def test_subscribe_instrument(self, authenticated_client, instrument):
        with patch("apps.core.views.load_instrument_candles.delay") as mock_delay:
            response = authenticated_client.post(
                f"/api/core/subscribed_instruments/{instrument.pk}/subscribe/"
            )
            assert response.status_code == status.HTTP_201_CREATED
            assert SubscribedInstruments.objects.count() == 1
            mock_delay.assert_called_once()

    def test_subscribe_instrument_already_subscribed(
        self, authenticated_client, subscribed_instrument
    ):
        instrument = Instrument.objects.get(pk=subscribed_instrument.pk)
        response = authenticated_client.post(
            f"/api/core/subscribed_instruments/{instrument.pk}/subscribe/"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "already subscribed"


@pytest.mark.django_db
class TestCandleViewSet:
    def test_get_candles(self, authenticated_client, subscribed_instrument):
        response = authenticated_client.get(
            f"/api/core/candles/get_candles/?id={subscribed_instrument.pk}"
        )
        assert response.status_code == status.HTTP_200_OK

    def test_get_candles_missing_id(self, authenticated_client):
        response = authenticated_client.get("/api/core/candles/get_candles/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["msg"] == "Missing instrument ID"
