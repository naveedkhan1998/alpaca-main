from unittest.mock import Mock

from django.utils import timezone
import pytest

from apps.core.models import Asset, Candle
from apps.core.services.websocket.persistence import CandleRepository
from main import const


@pytest.mark.django_db
class TestCandleRepository:
    """Test candle persistence operations."""

    def setup_method(self):
        """Set up test data."""
        self.repo = CandleRepository()
        self.asset = Asset.objects.create(
            alpaca_id="test-asset-1",
            symbol="TEST",
            name="Test Asset",
            asset_class="us_equity",
        )

    def test_save_candles_empty_updates(self):
        """Test saving empty updates does nothing."""
        self.repo.save_candles(const.TF_1T, {})
        assert Candle.objects.count() == 0

    def test_save_candles_create_new_delta_mode(self):
        """Test creating new candles in delta mode."""
        ts = timezone.now().replace(second=0, microsecond=0)
        updates = {
            (self.asset.id, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            }
        }

        self.repo.save_candles(const.TF_1T, updates, write_mode="delta")

        candle = Candle.objects.get()
        assert candle.asset_id == self.asset.id
        assert candle.timestamp == ts
        assert candle.timeframe == const.TF_1T
        assert candle.open == 100.0
        assert candle.high == 105.0
        assert candle.low == 95.0
        assert candle.close == 102.0
        assert candle.volume == 1000

    def test_save_candles_create_new_snapshot_mode(self):
        """Test creating new candles in snapshot mode."""
        ts = timezone.now().replace(second=0, microsecond=0)
        updates = {
            (self.asset.id, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            }
        }

        self.repo.save_candles(const.TF_1T, updates, write_mode="snapshot")

        candle = Candle.objects.get()
        assert candle.volume == 1000  # Same in snapshot mode for new candles

    def test_save_candles_update_existing_delta_mode(self):
        """Test updating existing candles in delta mode (volume addition)."""
        ts = timezone.now().replace(second=0, microsecond=0)

        # Create initial candle
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=500,
        )

        # Update with delta mode
        updates = {
            (self.asset.id, ts): {
                "open": None,  # Should not overwrite
                "high": 110.0,  # Should update high
                "low": 90.0,  # Should update low
                "close": 108.0,  # Should update close
                "volume": 300,  # Should add to existing
            }
        }

        self.repo.save_candles(const.TF_1T, updates, write_mode="delta")

        candle = Candle.objects.get()
        assert candle.open == 100.0  # Unchanged
        assert candle.high == 110.0  # Updated
        assert candle.low == 90.0  # Updated
        assert candle.close == 108.0  # Updated
        assert candle.volume == 800  # Added (500 + 300)

    def test_save_candles_update_existing_snapshot_mode(self):
        """Test updating existing candles in snapshot mode (volume replacement)."""
        ts = timezone.now().replace(second=0, microsecond=0)

        # Create initial candle
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts,
            timeframe=const.TF_1T,
            open=105.0,
            high=115.0,
            low=100.0,
            close=112.0,
            volume=500,
        )

        # Update with snapshot mode
        updates = {
            (self.asset.id, ts): {
                "open": 105.0,
                "high": 115.0,
                "low": 100.0,
                "close": 112.0,
                "volume": 300,  # Should replace
            }
        }

        self.repo.save_candles(const.TF_1T, updates, write_mode="snapshot")

        candle = Candle.objects.get()
        assert candle.open == 105.0
        assert candle.high == 115.0
        assert candle.low == 100.0
        assert candle.close == 112.0
        assert candle.volume == 300  # Replaced

    def test_save_candles_with_minute_ids(self):
        """Test saving candles with minute candle IDs."""
        ts = timezone.now().replace(second=0, microsecond=0)
        updates = {
            (self.asset.id, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
                "minute_candle_ids": [1, 2, 3],
            }
        }

        self.repo.save_candles(const.TF_1T, updates)

        candle = Candle.objects.get()
        assert candle.minute_candle_ids == [1, 2, 3]

    def test_save_candles_merge_minute_ids(self):
        """Test merging minute candle IDs on updates."""
        ts = timezone.now().replace(second=0, microsecond=0)

        # Create initial candle with some IDs
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=500,
            minute_candle_ids=[1, 2],
        )

        # Update with additional IDs
        updates = {
            (self.asset.id, ts): {
                "volume": 300,
                "minute_candle_ids": [2, 3, 4],  # 2 is duplicate
            }
        }

        self.repo.save_candles(const.TF_1T, updates)

        candle = Candle.objects.get()
        assert set(candle.minute_candle_ids) == {1, 2, 3, 4}  # Merged and deduplicated

    def test_save_candles_partial_updates(self):
        """Test partial updates (some fields None)."""
        ts = timezone.now().replace(second=0, microsecond=0)

        # Create initial candle
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=500,
        )

        # Partial update
        updates = {
            (self.asset.id, ts): {
                "high": 110.0,
                "close": 108.0,
                # open, low, volume not provided
            }
        }

        self.repo.save_candles(const.TF_1T, updates)

        candle = Candle.objects.get()
        assert candle.open == 100.0  # Unchanged
        assert candle.high == 110.0  # Updated
        assert candle.low == 95.0  # Unchanged
        assert candle.close == 108.0  # Updated
        assert candle.volume == 500  # Unchanged

    def test_save_candles_multiple_assets(self):
        """Test saving candles for multiple assets."""
        asset2 = Asset.objects.create(
            alpaca_id="test-asset-2",
            symbol="TEST2",
            name="Test Asset 2",
            asset_class="us_equity",
        )

        ts = timezone.now().replace(second=0, microsecond=0)
        updates = {
            (self.asset.id, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            },
            (asset2.id, ts): {
                "open": 200.0,
                "high": 205.0,
                "low": 195.0,
                "close": 202.0,
                "volume": 2000,
            },
        }

        self.repo.save_candles(const.TF_1T, updates)

        assert Candle.objects.count() == 2
        candles = {candle.asset_id: candle for candle in Candle.objects.all()}

        assert candles[self.asset.id].open == 100.0
        assert candles[asset2.id].open == 200.0

    def test_fetch_minute_ids_empty(self):
        """Test fetching minute IDs with no data."""
        result = self.repo.fetch_minute_ids([])
        assert result == {}

    def test_fetch_minute_ids(self):
        """Test fetching minute IDs for existing candles."""
        ts1 = timezone.now().replace(second=0, microsecond=0)
        ts2 = ts1.replace(minute=ts1.minute + 1)

        # Create candles
        candle1 = Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts1,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )
        candle2 = Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts2,
            timeframe=const.TF_1T,
            open=102.0,
            high=107.0,
            low=97.0,
            close=104.0,
            volume=1500,
        )

        keys = [(self.asset.id, ts1), (self.asset.id, ts2)]
        result = self.repo.fetch_minute_ids(keys)

        expected = {
            (self.asset.id, ts1): candle1.id,
            (self.asset.id, ts2): candle2.id,
        }
        assert result == expected

    def test_fetch_minute_ids_partial_matches(self):
        """Test fetching minute IDs when some keys don't exist."""
        ts1 = timezone.now().replace(second=0, microsecond=0)
        ts2 = ts1.replace(minute=ts1.minute + 1)

        # Create only one candle
        candle1 = Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=ts1,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )

        keys = [(self.asset.id, ts1), (self.asset.id, ts2)]  # ts2 doesn't exist
        result = self.repo.fetch_minute_ids(keys)

        expected = {(self.asset.id, ts1): candle1.id}
        assert result == expected

    def test_save_candles_exception_handling(self):
        """Test exception handling in save_candles."""
        ts = timezone.now().replace(second=0, microsecond=0)
        updates = {
            (self.asset.id, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            }
        }

        # Mock logger to capture exception logging
        mock_logger = Mock()
        self.repo.save_candles(const.TF_1T, updates, logger=mock_logger)

        # Should not raise exception, should log it
        assert Candle.objects.count() == 1  # Still created the candle
