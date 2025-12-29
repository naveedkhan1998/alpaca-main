"""
Tests for the CandlePersistence layer.

These tests verify that the persistence layer correctly delegates to
the underlying repository and invalidates cache appropriately.

Note: The actual PostgreSQL upsert logic is tested via integration tests
since it uses raw SQL that's incompatible with SQLite. We inject a mock
repository to test the persistence layer in isolation.
"""

from decimal import Decimal
from unittest.mock import Mock, patch

from django.utils import timezone
import pytest

from apps.core.models import Asset
from apps.core.services.websocket.persistence import CandlePersistence
from main import const


@pytest.fixture
def mock_repo():
    """Create a mock repository for testing."""
    repo = Mock()
    repo.upsert_minute_candles.return_value = 0
    repo.upsert_aggregated_candles.return_value = 0
    repo.bulk_insert_minute_candles.return_value = 0
    return repo


@pytest.mark.django_db
class TestCandlePersistence:
    """Test candle persistence operations."""

    def setup_method(self):
        """Set up test data."""
        self.asset = Asset.objects.create(
            alpaca_id="test-asset-1",
            symbol="TEST",
            name="Test Asset",
            asset_class="us_equity",
        )

    def test_upsert_minutes_empty(self, mock_repo):
        """Test upserting empty candle list does nothing."""
        persistence = CandlePersistence(_repo=mock_repo)
        result = persistence.upsert_minutes([])
        assert result == 0
        mock_repo.upsert_minute_candles.assert_not_called()

    def test_upsert_minutes_calls_repo(self, mock_repo):
        """Test upsert_minutes delegates to repository."""
        ts = timezone.now().replace(second=0, microsecond=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            }
        ]

        mock_repo.upsert_minute_candles.return_value = 1

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            result = persistence.upsert_minutes(candles, mode="delta")

            assert result == 1
            mock_repo.upsert_minute_candles.assert_called_once_with(
                candles, mode="delta"
            )
            mock_cache.invalidate.assert_called_once_with(self.asset.id, const.TF_1T)

    def test_upsert_minutes_snapshot_mode(self, mock_repo):
        """Test upsert_minutes with snapshot mode."""
        ts = timezone.now().replace(second=0, microsecond=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            }
        ]

        mock_repo.upsert_minute_candles.return_value = 1

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            result = persistence.upsert_minutes(candles, mode="snapshot")

            assert result == 1
            mock_repo.upsert_minute_candles.assert_called_once_with(
                candles, mode="snapshot"
            )
            mock_cache.invalidate.assert_called()

    def test_upsert_minutes_multiple_assets(self, mock_repo):
        """Test upserting minute candles for multiple assets invalidates all caches."""
        asset2 = Asset.objects.create(
            alpaca_id="test-asset-2",
            symbol="TEST2",
            name="Test Asset 2",
            asset_class="us_equity",
        )

        ts = timezone.now().replace(second=0, microsecond=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            },
            {
                "asset_id": asset2.id,
                "timestamp": ts,
                "open": Decimal("200.0"),
                "high": Decimal("205.0"),
                "low": Decimal("195.0"),
                "close": Decimal("202.0"),
                "volume": Decimal("2000"),
            },
        ]

        mock_repo.upsert_minute_candles.return_value = 2

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            result = persistence.upsert_minutes(candles)

            assert result == 2
            # Should invalidate cache for both assets
            assert mock_cache.invalidate.call_count == 2


@pytest.mark.django_db
class TestAggregatedCandlePersistence:
    """Test aggregated candle persistence operations."""

    def setup_method(self):
        """Set up test data."""
        self.asset = Asset.objects.create(
            alpaca_id="test-asset-1",
            symbol="TEST",
            name="Test Asset",
            asset_class="us_equity",
        )

    def test_upsert_aggregated_empty(self, mock_repo):
        """Test upserting empty aggregated candle list does nothing."""
        persistence = CandlePersistence(_repo=mock_repo)
        result = persistence.upsert_aggregated(const.TF_1H, [])
        assert result == 0
        mock_repo.upsert_aggregated_candles.assert_not_called()

    def test_upsert_aggregated_calls_repo(self, mock_repo):
        """Test upsert_aggregated delegates to repository."""
        ts = timezone.now().replace(second=0, microsecond=0, minute=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("110.0"),
                "low": Decimal("95.0"),
                "close": Decimal("105.0"),
                "volume": Decimal("10000"),
            }
        ]

        mock_repo.upsert_aggregated_candles.return_value = 1

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            result = persistence.upsert_aggregated(const.TF_1H, candles)

            assert result == 1
            mock_repo.upsert_aggregated_candles.assert_called_once_with(
                const.TF_1H, candles, mode="snapshot"
            )
            mock_cache.invalidate.assert_called_once_with(self.asset.id, const.TF_1H)

    def test_upsert_aggregated_multiple_timeframes(self, mock_repo):
        """Test upserting aggregated candles for different timeframes."""
        ts = timezone.now().replace(second=0, microsecond=0, minute=0, hour=0)
        candle_5t = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            }
        ]
        candle_1h = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("110.0"),
                "low": Decimal("90.0"),
                "close": Decimal("105.0"),
                "volume": Decimal("10000"),
            }
        ]

        mock_repo.upsert_aggregated_candles.return_value = 1

        with patch("apps.core.services.websocket.persistence.candle_cache"):
            persistence = CandlePersistence(_repo=mock_repo)
            persistence.upsert_aggregated("5T", candle_5t)
            persistence.upsert_aggregated(const.TF_1H, candle_1h)

            assert mock_repo.upsert_aggregated_candles.call_count == 2


@pytest.mark.django_db
class TestBulkInsertMinuteCandles:
    """Test bulk insert operations for minute candles."""

    def setup_method(self):
        """Set up test data."""
        self.asset = Asset.objects.create(
            alpaca_id="test-asset-1",
            symbol="TEST",
            name="Test Asset",
            asset_class="us_equity",
        )

    def test_bulk_insert_empty(self, mock_repo):
        """Test bulk inserting empty list does nothing."""
        persistence = CandlePersistence(_repo=mock_repo)
        result = persistence.bulk_insert_minutes([])
        assert result == 0
        mock_repo.bulk_insert_minute_candles.assert_not_called()

    def test_bulk_insert_calls_repo(self, mock_repo):
        """Test bulk_insert_minutes delegates to repository."""
        ts1 = timezone.now().replace(second=0, microsecond=0)
        ts2 = ts1.replace(minute=ts1.minute + 1 if ts1.minute < 59 else 0)

        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts1,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            },
            {
                "asset_id": self.asset.id,
                "timestamp": ts2,
                "open": Decimal("102.0"),
                "high": Decimal("107.0"),
                "low": Decimal("100.0"),
                "close": Decimal("105.0"),
                "volume": Decimal("1500"),
            },
        ]

        mock_repo.bulk_insert_minute_candles.return_value = 2

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            result = persistence.bulk_insert_minutes(candles)

            assert result == 2
            mock_repo.bulk_insert_minute_candles.assert_called_once_with(
                candles, ignore_conflicts=True
            )
            mock_cache.invalidate.assert_called()

    def test_bulk_insert_ignore_conflicts(self, mock_repo):
        """Test bulk insert with ignore_conflicts parameter."""
        ts = timezone.now().replace(second=0, microsecond=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            }
        ]

        mock_repo.bulk_insert_minute_candles.return_value = 0

        with patch("apps.core.services.websocket.persistence.candle_cache"):
            persistence = CandlePersistence(_repo=mock_repo)
            _ = persistence.bulk_insert_minutes(candles, ignore_conflicts=False)

            mock_repo.bulk_insert_minute_candles.assert_called_once_with(
                candles, ignore_conflicts=False
            )


@pytest.mark.django_db
class TestCacheInvalidation:
    """Test that cache is invalidated on writes."""

    def setup_method(self):
        """Set up test data."""
        self.asset = Asset.objects.create(
            alpaca_id="test-asset-1",
            symbol="TEST",
            name="Test Asset",
            asset_class="us_equity",
        )

    def test_upsert_minutes_invalidates_cache(self, mock_repo):
        """Test that upserting minute candles invalidates the cache."""
        ts = timezone.now().replace(second=0, microsecond=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("105.0"),
                "low": Decimal("95.0"),
                "close": Decimal("102.0"),
                "volume": Decimal("1000"),
            }
        ]

        mock_repo.upsert_minute_candles.return_value = 1

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            persistence.upsert_minutes(candles)

            mock_cache.invalidate.assert_called_once_with(self.asset.id, const.TF_1T)

    def test_upsert_aggregated_invalidates_cache(self, mock_repo):
        """Test that upserting aggregated candles invalidates the cache."""
        ts = timezone.now().replace(second=0, microsecond=0, minute=0)
        candles = [
            {
                "asset_id": self.asset.id,
                "timestamp": ts,
                "open": Decimal("100.0"),
                "high": Decimal("110.0"),
                "low": Decimal("95.0"),
                "close": Decimal("105.0"),
                "volume": Decimal("10000"),
            }
        ]

        mock_repo.upsert_aggregated_candles.return_value = 1

        with patch(
            "apps.core.services.websocket.persistence.candle_cache"
        ) as mock_cache:
            persistence = CandlePersistence(_repo=mock_repo)
            persistence.upsert_aggregated(const.TF_1H, candles)

            mock_cache.invalidate.assert_called_once_with(self.asset.id, const.TF_1H)
