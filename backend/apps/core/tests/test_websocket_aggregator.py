from datetime import timedelta
from unittest.mock import Mock

from django.utils import timezone

from apps.core.services.websocket.aggregator import TimeframeAggregator
from apps.core.services.websocket.persistence import CandlePersistence
from apps.core.services.websocket.utils import floor_to_bucket
from main import const


class TestTimeframeAggregator:
    """Test timeframe aggregation logic."""

    def setup_method(self):
        """Set up test data."""
        self.mock_repo = Mock(spec=CandlePersistence)
        self.mock_backfill = Mock()
        self.mock_logger = Mock()

        self.aggregator = TimeframeAggregator(
            repo=self.mock_repo,
            backfill=self.mock_backfill,
            logger=self.mock_logger,
            open_flush_secs=0.1,  # Fast for testing
        )

    def test_rollup_from_minutes_empty(self):
        """Test rollup with empty minute data."""
        touched = self.aggregator.rollup_from_minutes({})

        assert touched == {}
        self.mock_repo.upsert_aggregated.assert_not_called()

    def test_rollup_from_minutes_single_candle(self):
        """Test rollup with single 1T candle."""
        ts = timezone.now().replace(second=0, microsecond=0)
        m1_map = {
            (1, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            }
        }

        touched = self.aggregator.rollup_from_minutes(m1_map)

        # Should touch all higher timeframes
        # Calculate expected bucket timestamps
        expected_touched = {}
        for tf in const.TF_CFG:
            if tf != const.TF_1T:
                delta = const.TF_CFG[tf]
                bucket_ts = floor_to_bucket(ts, delta)
                expected_touched[tf] = {(1, bucket_ts)}

        assert touched == expected_touched

        # Check accumulator state
        for tf in const.TF_CFG:
            if tf != const.TF_1T:
                acc = self.aggregator._tf_acc[tf]
                delta = const.TF_CFG[tf]
                bucket_ts = floor_to_bucket(ts, delta)
                key = (1, bucket_ts)
                assert key in acc
                assert acc[key]["open"] == 100.0
                assert acc[key]["high"] == 105.0
                assert acc[key]["low"] == 95.0
                assert acc[key]["close"] == 102.0
                assert acc[key]["volume"] == 1000

    def test_rollup_from_minutes_multiple_candles_same_bucket(self):
        """Test rollup with multiple candles in same bucket."""
        base_ts = timezone.now().replace(second=0, microsecond=0, minute=0)
        ts1 = base_ts
        ts2 = base_ts + timedelta(minutes=1)

        m1_map = {
            (1, ts1): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 500,
            },
            (1, ts2): {
                "open": 102.0,
                "high": 110.0,
                "low": 98.0,
                "close": 108.0,
                "volume": 700,
            },
        }

        _touched = self.aggregator.rollup_from_minutes(m1_map)

        # Check hourly accumulator (assuming TF_1H exists)
        if const.TF_1H in const.TF_CFG:
            acc = self.aggregator._tf_acc[const.TF_1H]
            key = (1, base_ts)
            assert key in acc
            candle = acc[key]
            assert candle["open"] == 100.0  # First open
            assert candle["high"] == 110.0  # Max of both
            assert candle["low"] == 95.0  # Min of both
            assert candle["close"] == 108.0  # Last close
            assert candle["volume"] == 1200  # Sum of volumes

    def test_rollup_from_minutes_different_assets(self):
        """Test rollup with multiple assets."""
        ts = timezone.now().replace(second=0, microsecond=0)
        m1_map = {
            (1, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            },
            (2, ts): {
                "open": 200.0,
                "high": 205.0,
                "low": 195.0,
                "close": 202.0,
                "volume": 2000,
            },
        }

        _touched = self.aggregator.rollup_from_minutes(m1_map)

        # Should have separate accumulators for each asset
        for tf in const.TF_CFG:
            if tf != const.TF_1T:
                acc = self.aggregator._tf_acc[tf]
                delta = const.TF_CFG[tf]
                bucket_ts = floor_to_bucket(ts, delta)
                assert (1, bucket_ts) in acc
                assert (2, bucket_ts) in acc

    def test_reset_for_asset(self):
        """Test resetting accumulators for specific asset."""
        ts = timezone.now().replace(second=0, microsecond=0)

        # Populate accumulator
        m1_map = {
            (1, ts): {
                "open": 100.0,
                "high": 105.0,
                "low": 95.0,
                "close": 102.0,
                "volume": 1000,
            }
        }
        self.aggregator.rollup_from_minutes(m1_map)

        # Verify data exists
        assert len(self.aggregator._tf_acc[const.TF_1H]) > 0

        # Reset for asset
        self.aggregator.reset_for_asset(1)

        # Verify data is cleared
        for tf in const.TF_CFG:
            if tf != const.TF_1T:
                acc = self.aggregator._tf_acc[tf]
                asset_keys = [k for k in acc.keys() if k[0] == 1]
                assert len(asset_keys) == 0

    def test_persist_open_no_touched(self):
        """Test persist_open with no touched timeframes."""
        latest_ts = timezone.now()
        self.aggregator.persist_open({}, latest_ts)

        self.mock_repo.upsert_aggregated.assert_not_called()

    def test_persist_open_with_touched(self):
        """Test persist_open with touched timeframes."""
        ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Set up accumulator data
        bucket_ts = ts.replace(minute=0)
        self.aggregator._tf_acc[const.TF_1H][(asset_id, bucket_ts)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }

        # Mock backfill to allow persistence
        self.mock_backfill.is_historical_complete.return_value = True

        touched = {const.TF_1H: {(asset_id, bucket_ts)}}
        self.aggregator.persist_open(touched, ts)

        # Should call upsert_aggregated
        self.mock_repo.upsert_aggregated.assert_called_once()
        call_args = self.mock_repo.upsert_aggregated.call_args
        assert call_args[0][0] == const.TF_1H  # timeframe
        assert len(call_args[0][1]) == 1  # one candle
        candle = call_args[0][1][0]
        assert candle["asset_id"] == asset_id
        assert candle["timestamp"] == bucket_ts

    def test_persist_open_backfill_not_complete(self):
        """Test persist_open when backfill is not complete."""
        ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Set up accumulator data
        bucket_ts = ts.replace(minute=0)
        self.aggregator._tf_acc[const.TF_1H][(asset_id, bucket_ts)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }

        # Mock backfill to prevent persistence
        self.mock_backfill.is_historical_complete.return_value = False

        touched = {const.TF_1H: {(asset_id, bucket_ts)}}
        self.aggregator.persist_open(touched, ts)

        # Should not call upsert_aggregated
        self.mock_repo.upsert_aggregated.assert_not_called()

    def test_persist_open_bucket_not_open(self):
        """Test persist_open when bucket end time is before latest timestamp."""
        ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Set up accumulator data for a bucket that's already closed
        bucket_ts = ts.replace(minute=0) - timedelta(hours=2)  # 2 hours ago
        self.aggregator._tf_acc[const.TF_1H][(asset_id, bucket_ts)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }

        # Mock backfill to allow persistence
        self.mock_backfill.is_historical_complete.return_value = True

        touched = {const.TF_1H: {(asset_id, bucket_ts)}}
        self.aggregator.persist_open(touched, ts)

        # Should not call upsert_aggregated since bucket is closed
        self.mock_repo.upsert_aggregated.assert_not_called()

    def test_persist_open_throttling(self):
        """Test that persist_open throttles calls."""
        ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Set up accumulator data
        bucket_ts = ts.replace(minute=0)
        self.aggregator._tf_acc[const.TF_1H][(asset_id, bucket_ts)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }

        # Mock backfill to allow persistence
        self.mock_backfill.is_historical_complete.return_value = True

        touched = {const.TF_1H: {(asset_id, bucket_ts)}}

        # First call should persist
        self.aggregator.persist_open(touched, ts)
        assert self.mock_repo.upsert_aggregated.call_count == 1

        # Second call immediately after should be throttled
        self.aggregator.persist_open(touched, ts)
        assert self.mock_repo.upsert_aggregated.call_count == 1  # Still 1

    def test_flush_closed_no_data(self):
        """Test flush_closed with no accumulator data."""
        latest_ts = timezone.now()
        self.aggregator.flush_closed(latest_ts)

        self.mock_repo.upsert_aggregated.assert_not_called()

    def test_flush_closed_with_closed_buckets(self):
        """Test flush_closed with buckets that have ended."""
        latest_ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Create a bucket that ended before latest_ts
        bucket_ts = latest_ts - timedelta(hours=2)  # 2 hours ago
        self.aggregator._tf_acc[const.TF_1H][(asset_id, bucket_ts)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }

        # Mock backfill to allow flushing
        self.mock_backfill.is_historical_complete.return_value = True

        self.aggregator.flush_closed(latest_ts)

        # Should call upsert_aggregated and remove from accumulator
        self.mock_repo.upsert_aggregated.assert_called_once()
        call_args = self.mock_repo.upsert_aggregated.call_args
        assert call_args[0][0] == const.TF_1H  # timeframe
        assert len(call_args[0][1]) == 1  # one candle
        candle = call_args[0][1][0]
        assert candle["asset_id"] == asset_id
        assert candle["timestamp"] == bucket_ts

        # Should be removed from accumulator
        assert (asset_id, bucket_ts) not in self.aggregator._tf_acc[const.TF_1H]

    def test_flush_closed_backfill_not_complete(self):
        """Test flush_closed when backfill is not complete."""
        latest_ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Create a closed bucket
        bucket_ts = latest_ts - timedelta(hours=2)
        self.aggregator._tf_acc[const.TF_1H][(asset_id, bucket_ts)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }

        # Mock backfill to prevent flushing
        self.mock_backfill.is_historical_complete.return_value = False

        self.aggregator.flush_closed(latest_ts)

        # Should not call upsert_aggregated and should remove from accumulator
        self.mock_repo.upsert_aggregated.assert_not_called()
        assert (asset_id, bucket_ts) not in self.aggregator._tf_acc[const.TF_1H]

    def test_flush_closed_open_buckets_untouched(self):
        """Test flush_closed leaves open buckets untouched."""
        latest_ts = timezone.now().replace(second=0, microsecond=0)
        asset_id = 1

        # Create buckets: one closed, one still open
        closed_bucket = latest_ts - timedelta(hours=2)
        open_bucket = latest_ts.replace(minute=0)  # Current hour

        self.aggregator._tf_acc[const.TF_1H][(asset_id, closed_bucket)] = {
            "open": 100.0,
            "high": 105.0,
            "low": 95.0,
            "close": 102.0,
            "volume": 1000,
        }
        self.aggregator._tf_acc[const.TF_1H][(asset_id, open_bucket)] = {
            "open": 200.0,
            "high": 205.0,
            "low": 195.0,
            "close": 202.0,
            "volume": 2000,
        }

        # Mock backfill to allow flushing
        self.mock_backfill.is_historical_complete.return_value = True

        self.aggregator.flush_closed(latest_ts)

        # Should only flush closed bucket
        self.mock_repo.upsert_aggregated.assert_called_once()
        call_args = self.mock_repo.upsert_aggregated.call_args
        candles = call_args[0][1]
        saved_keys = {(c["asset_id"], c["timestamp"]) for c in candles}
        assert (asset_id, closed_bucket) in saved_keys
        assert (asset_id, open_bucket) not in saved_keys

        # Open bucket should remain
        assert (asset_id, open_bucket) in self.aggregator._tf_acc[const.TF_1H]

    def test_initialization(self):
        """Test proper initialization of aggregator."""
        assert isinstance(self.aggregator.repo, Mock)
        assert isinstance(self.aggregator.backfill, Mock)
        assert self.aggregator.logger == self.mock_logger
        assert self.aggregator.open_flush_secs == 0.1
        assert self.aggregator._open_flush_secs == 0.1

        # Should have accumulators for all higher timeframes
        for tf in const.TF_CFG:
            if tf != const.TF_1T:
                assert tf in self.aggregator._tf_acc
                assert isinstance(self.aggregator._tf_acc[tf], dict)

        # Should have flush timestamps initialized
        for tf in const.TF_CFG:
            if tf != const.TF_1T:
                assert self.aggregator._last_open_flush[tf] == 0.0
