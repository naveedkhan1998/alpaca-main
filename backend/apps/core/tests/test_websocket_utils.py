from datetime import datetime
from unittest.mock import patch

from django.utils import timezone
import pytz

from apps.core.services.websocket.utils import (
    floor_to_bucket,
    is_regular_trading_hours,
    parse_tick_timestamp,
)


class TestParseTickTimestamp:
    """Test timestamp parsing functionality."""

    def test_parse_zulu_timestamp(self):
        """Test parsing ISO8601 timestamp with Z suffix."""
        ts_str = "2023-10-30T14:30:45.123456Z"
        result = parse_tick_timestamp(ts_str)

        expected = datetime(2023, 10, 30, 14, 30, tzinfo=pytz.UTC)
        assert result == expected
        assert result.second == 0  # Should be floored to minute
        assert result.microsecond == 0

    def test_parse_offset_timestamp(self):
        """Test parsing ISO8601 timestamp with timezone offset."""
        ts_str = "2023-10-30T14:30:45.123456+00:00"
        result = parse_tick_timestamp(ts_str)

        expected = datetime(2023, 10, 30, 14, 30, tzinfo=pytz.UTC)
        assert result == expected
        assert result.second == 0
        assert result.microsecond == 0

    def test_parse_naive_timestamp(self):
        """Test parsing naive timestamp gets UTC timezone."""
        ts_str = "2023-10-30T14:30:45.123456"
        result = parse_tick_timestamp(ts_str)

        expected = timezone.make_aware(
            datetime(2023, 10, 30, 14, 30, 45, 123456), pytz.UTC
        ).replace(second=0, microsecond=0)
        assert result == expected
        assert result.tzinfo == pytz.UTC


class TestFloorToBucket:
    """Test timestamp flooring to timeframe buckets."""

    def test_floor_to_minute_bucket(self):
        """Test flooring to 1-minute buckets."""
        ts = datetime(2023, 10, 30, 14, 30, 45, tzinfo=pytz.UTC)
        delta = timezone.timedelta(minutes=1)

        result = floor_to_bucket(ts, delta)
        expected = datetime(2023, 10, 30, 14, 30, tzinfo=pytz.UTC)
        assert result == expected

    def test_floor_to_5_minute_bucket(self):
        """Test flooring to 5-minute buckets."""
        ts = datetime(2023, 10, 30, 14, 32, 45, tzinfo=pytz.UTC)
        delta = timezone.timedelta(minutes=5)

        result = floor_to_bucket(ts, delta)
        expected = datetime(2023, 10, 30, 14, 30, tzinfo=pytz.UTC)
        assert result == expected

    def test_floor_to_hour_bucket(self):
        """Test flooring to 1-hour buckets."""
        ts = datetime(2023, 10, 30, 14, 45, 30, tzinfo=pytz.UTC)
        delta = timezone.timedelta(hours=1)

        result = floor_to_bucket(ts, delta)
        expected = datetime(2023, 10, 30, 14, 0, tzinfo=pytz.UTC)
        assert result == expected

    def test_floor_naive_timestamp(self):
        """Test flooring naive timestamp gets UTC timezone."""
        ts = datetime(2023, 10, 30, 14, 32, 45)
        delta = timezone.timedelta(minutes=5)

        result = floor_to_bucket(ts, delta)
        expected = datetime(2023, 10, 30, 14, 30, tzinfo=pytz.UTC)
        assert result == expected


class TestIsRegularTradingHours:
    """Test regular trading hours detection."""

    def test_weekday_rth(self):
        """Test regular trading hours on weekday."""
        # Monday 10:00 AM ET = 14:00 UTC
        ts = datetime(2023, 10, 30, 14, 0, tzinfo=pytz.UTC)
        assert is_regular_trading_hours(ts) is True

    def test_weekday_pre_market(self):
        """Test pre-market hours on weekday."""
        # Monday 8:00 AM ET = 12:00 UTC
        ts = datetime(2023, 10, 30, 12, 0, tzinfo=pytz.UTC)
        assert is_regular_trading_hours(ts) is False

    def test_weekday_after_hours(self):
        """Test after-hours on weekday."""
        # Monday 5:00 PM ET = 21:00 UTC
        ts = datetime(2023, 10, 30, 21, 0, tzinfo=pytz.UTC)
        assert is_regular_trading_hours(ts) is False

    def test_weekend(self):
        """Test weekend hours."""
        # Saturday 10:00 AM ET = 14:00 UTC
        ts = datetime(2023, 10, 28, 14, 0, tzinfo=pytz.UTC)  # Saturday
        assert is_regular_trading_hours(ts) is False

    def test_market_open_exact(self):
        """Test exact market open time."""
        # Monday 9:30 AM ET = 13:30 UTC
        ts = datetime(2023, 10, 30, 13, 30, tzinfo=pytz.UTC)
        assert is_regular_trading_hours(ts) is True

    def test_market_close_exact(self):
        """Test exact market close time (should be False as it's < 16:00)."""
        # Monday 4:00 PM ET = 20:00 UTC
        ts = datetime(2023, 10, 30, 20, 0, tzinfo=pytz.UTC)
        assert is_regular_trading_hours(ts) is False

    @patch("apps.core.services.websocket.utils.pytz.timezone")
    def test_exception_fallback(self, mock_timezone):
        """Test exception handling falls back to True."""
        mock_timezone.side_effect = Exception("Timezone error")

        ts = datetime(2023, 10, 30, 14, 0, tzinfo=pytz.UTC)
        assert is_regular_trading_hours(ts) is True
