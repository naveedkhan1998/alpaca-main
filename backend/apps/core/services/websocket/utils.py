from __future__ import annotations

from datetime import datetime, timedelta

from django.utils import timezone
import pytz


def parse_tick_timestamp(ts_str: str) -> datetime:
    """Parse an Alpaca ISO8601 timestamp to timezone-aware UTC minute precision."""
    if ts_str.endswith("Z"):
        ts_str = ts_str[:-1] + "+00:00"
    ts = datetime.fromisoformat(ts_str)
    if ts.tzinfo is None:
        ts = timezone.make_aware(ts, pytz.UTC)
    return ts.replace(second=0, microsecond=0)


def floor_to_bucket(ts: datetime, delta: timedelta) -> datetime:
    """Floor a timestamp to the start of its timeframe bucket in UTC."""
    if ts.tzinfo is None:
        ts = timezone.make_aware(ts, pytz.UTC)
    minutes = int(delta.total_seconds() // 60)
    if minutes <= 0:
        return ts.replace(second=0, microsecond=0)
    total_min = int(ts.timestamp() // 60)
    bucket_min = (total_min // minutes) * minutes
    return datetime.fromtimestamp(bucket_min * 60, tz=pytz.UTC)


def is_regular_trading_hours(ts_utc: datetime) -> bool:
    """Return True if the UTC timestamp falls within U.S. equities RTH.

    RTH: 09:30–16:00 America/New_York, Monday–Friday. Holidays are not
    explicitly checked here; those ticks (if any) will be filtered by date.
    """
    try:
        ny = pytz.timezone("America/New_York")
        ts_local = ts_utc.astimezone(ny)
        if ts_local.weekday() > 4:
            return False
        t = ts_local.timetz()
        start = ts_local.replace(hour=9, minute=30, second=0, microsecond=0).timetz()
        end = ts_local.replace(hour=16, minute=0, second=0, microsecond=0).timetz()
        return start <= t < end
    except Exception:
        # Be safe, default to allow
        return True
