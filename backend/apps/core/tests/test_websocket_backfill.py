from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from django.utils import timezone
import pytest

from apps.core.models import Asset, Candle, WatchListAsset
from apps.core.services.websocket.backfill import BackfillGuard
from main import const


@pytest.mark.django_db
class TestBackfillGuard:
    """Test backfill guard logic."""

    def setup_method(self):
        """Set up test data."""
        self.mock_schedule = Mock()
        self.guard = BackfillGuard(schedule_backfill=self.mock_schedule)

        self.asset = Asset.objects.create(
            alpaca_id="test-asset-1",
            symbol="TEST",
            name="Test Asset",
            asset_class="us_equity",
        )

        # Create watchlist and associate asset for all tests
        from apps.core.models import WatchList

        self.watchlist = WatchList.objects.create(name="Test Watchlist", is_active=True)
        WatchListAsset.objects.create(
            watchlist=self.watchlist, asset=self.asset, is_active=True
        )

    def test_maybe_schedule_for_assets_no_data(self):
        """Test scheduling when asset has no candle data."""
        with patch(
            "apps.core.services.websocket.backfill.request_backfill"
        ) as mock_request:
            scheduled = self.guard.maybe_schedule_for_assets([self.asset.id])

            assert scheduled == {self.asset.id}
            mock_request.assert_called_once_with(
                self.asset.id, source="websocket-service"
            )

    def test_maybe_schedule_for_assets_recent_data(self):
        """Test not scheduling when asset has recent data."""
        # Create recent candle
        recent_ts = timezone.now() - timedelta(minutes=1)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=recent_ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )

        scheduled = self.guard.maybe_schedule_for_assets([self.asset.id])

        assert scheduled == set()
        self.mock_schedule.assert_not_called()

    def test_maybe_schedule_for_assets_stale_data(self):
        """Test scheduling when asset has stale data."""
        # Create old candle
        old_ts = timezone.now() - timedelta(minutes=10)  # Older than gap_threshold
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=old_ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )

        with patch(
            "apps.core.services.websocket.backfill.request_backfill"
        ) as mock_request:
            scheduled = self.guard.maybe_schedule_for_assets([self.asset.id])

            assert scheduled == {self.asset.id}
            mock_request.assert_called_once_with(
                self.asset.id, source="websocket-service"
            )

    def test_maybe_schedule_for_assets_cooldown(self):
        """Test cooldown prevents repeated scheduling."""
        with patch(
            "apps.core.services.websocket.backfill.request_backfill"
        ) as mock_request:
            # First call should schedule
            scheduled1 = self.guard.maybe_schedule_for_assets([self.asset.id])
            assert scheduled1 == {self.asset.id}
            assert mock_request.call_count == 1

            # Second call within cooldown should not schedule
            scheduled2 = self.guard.maybe_schedule_for_assets([self.asset.id])
            assert scheduled2 == set()
            assert mock_request.call_count == 1  # Still only 1 call

    def test_maybe_schedule_for_assets_multiple_assets(self):
        """Test scheduling for multiple assets."""
        asset2 = Asset.objects.create(
            alpaca_id="test-asset-2",
            symbol="TEST2",
            name="Test Asset 2",
            asset_class="us_equity",
        )
        # Add asset2 to watchlist
        WatchListAsset.objects.create(
            watchlist=self.watchlist, asset=asset2, is_active=True
        )

        with patch(
            "apps.core.services.websocket.backfill.request_backfill"
        ) as mock_request:
            # asset2 has no data, should schedule
            # asset1 has no data, should schedule
            scheduled = self.guard.maybe_schedule_for_assets([self.asset.id, asset2.id])

            assert scheduled == {self.asset.id, asset2.id}
            assert mock_request.call_count == 2

    def test_maybe_schedule_for_assets_exception_handling(self):
        """Test exception handling in scheduling."""
        # Create scenario that might cause exception
        with patch.object(Candle.objects, "filter", side_effect=Exception("DB error")):
            scheduled = self.guard.maybe_schedule_for_assets([self.asset.id])

            # Should handle exception gracefully and not schedule
            assert scheduled == set()
            self.mock_schedule.assert_not_called()

    def test_is_historical_complete_running_flag(self):
        """Test completion check when backfill is running."""
        with patch(
            "apps.core.services.websocket.backfill.cache.get", return_value=True
        ):
            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is False

    def test_is_historical_complete_explicit_completion(self):
        """Test completion check with explicit completion flag."""
        with patch("apps.core.services.websocket.backfill.cache.get") as mock_get:
            # First call returns None (not running), second returns True (completed)
            mock_get.side_effect = [None, True]

            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is True

    def test_is_historical_complete_no_data(self):
        """Test completion check with no candle data."""
        with patch(
            "apps.core.services.websocket.backfill.cache.get", return_value=None
        ):
            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is False

    def test_is_historical_complete_recent_only(self):
        """Test completion check with only recent data."""
        # Create recent candle
        recent_ts = timezone.now() - timedelta(hours=1)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=recent_ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )

        with patch(
            "apps.core.services.websocket.backfill.cache.get", return_value=None
        ):
            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is False

    def test_is_historical_complete_with_historical_data(self):
        """Test completion check with sufficient historical data."""
        # Create old candle (more than 4 days ago)
        old_ts = timezone.now() - timedelta(days=5)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=old_ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )

        # Create recent candle
        recent_ts = timezone.now() - timedelta(hours=1)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=recent_ts,
            timeframe=const.TF_1T,
            open=102.0,
            high=107.0,
            low=97.0,
            close=104.0,
            volume=1500,
        )

        # Create historical 5T candle to indicate completion
        historical_5t_ts = timezone.now() - timedelta(days=2)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=historical_5t_ts,
            timeframe=const.TF_5T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=5000,
        )

        with patch(
            "apps.core.services.websocket.backfill.cache.get", return_value=None
        ):
            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is True

    def test_is_historical_complete_higher_timeframe_exists(self):
        """Test completion check when higher timeframe has historical data."""
        # Create 1T data for coverage
        old_ts = timezone.now() - timedelta(days=5)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=old_ts,
            timeframe=const.TF_1T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=1000,
        )
        recent_ts = timezone.now() - timedelta(hours=1)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=recent_ts,
            timeframe=const.TF_1T,
            open=102.0,
            high=107.0,
            low=97.0,
            close=104.0,
            volume=1500,
        )

        # Create historical 5T candle
        historical_ts = timezone.now() - timedelta(days=2)
        Candle.objects.create(
            asset_id=self.asset.id,
            timestamp=historical_ts,
            timeframe=const.TF_5T,
            open=100.0,
            high=105.0,
            low=95.0,
            close=102.0,
            volume=5000,
        )

        with patch(
            "apps.core.services.websocket.backfill.cache.get", return_value=None
        ):
            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is True

    def test_is_historical_complete_cache_exception(self):
        """Test completion check handles cache exceptions."""
        with patch(
            "apps.core.services.websocket.backfill.cache.get",
            side_effect=Exception("Cache error"),
        ):
            # Should fall through to heuristic checks
            result = self.guard.is_historical_complete(
                self.asset.id, const.TF_5T, datetime.now()
            )
            assert result is False  # No data, so False

    @patch("apps.core.services.websocket.backfill.request_backfill")
    def test_maybe_schedule_calls_request_backfill(self, mock_request_backfill):
        """Test that maybe_schedule calls the request_backfill function."""
        scheduled = self.guard.maybe_schedule_for_assets([self.asset.id])

        assert scheduled == {self.asset.id}
        mock_request_backfill.assert_called_once_with(
            self.asset.id, source="websocket-service"
        )

    def test_cooldown_tracking(self):
        """Test cooldown tracking between calls."""
        import time

        with patch(
            "apps.core.services.websocket.backfill.request_backfill"
        ) as mock_request:
            # First call
            scheduled1 = self.guard.maybe_schedule_for_assets([self.asset.id])
            assert scheduled1 == {self.asset.id}
            assert mock_request.call_count == 1
            first_call_time = time.time()

            # Mock time to be just after cooldown
            with patch(
                "apps.core.services.websocket.backfill.time.time",
                return_value=first_call_time + 901,
            ):
                scheduled2 = self.guard.maybe_schedule_for_assets([self.asset.id])
                assert scheduled2 == {self.asset.id}  # Should schedule again
                assert mock_request.call_count == 2

    def test_watchlist_asset_filtering(self):
        """Test that only active watchlist assets are considered."""
        # Create watchlist and associate asset
        from apps.core.models import WatchList

        watchlist = WatchList.objects.create(name="Test Watchlist", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset, is_active=True
        )

        with patch(
            "apps.core.services.websocket.backfill.request_backfill"
        ) as mock_request:
            # Should still work the same way
            scheduled = self.guard.maybe_schedule_for_assets([self.asset.id])
            assert scheduled == {self.asset.id}
            mock_request.assert_called_once_with(
                self.asset.id, source="websocket-service"
            )
