from datetime import UTC, datetime, timedelta

import pytest

from apps.core.services.websocket.aggregator import CandleAggregator
from apps.core.services.websocket.repository import MarketRepository


class FakeRepo(MarketRepository):
    """Mock repository for testing without a DB."""

    def __init__(self):
        self.created = []
        self.updated = []
        self.existing = []

    def get_existing_candles(self, asset_ids, timestamps, timeframe):
        return self.existing

    def bulk_create_candles(self, candles):
        self.created.extend(candles)

    def bulk_update_candles(self, candles, fields):
        self.updated.extend(candles)


@pytest.fixture
def agg():
    """Fixture that provides a CandleAggregator with a mock repo."""
    repo = FakeRepo()
    tf_cfg = {
        "1T": timedelta(minutes=1),
        "5T": timedelta(minutes=5),
    }
    tf_acc = {tf: {} for tf in tf_cfg if tf != "1T"}
    last_open_flush = dict.fromkeys(tf_acc, 0.0)
    aggregator = CandleAggregator(
        repo, tf_cfg, tf_acc, last_open_flush, 0.0
    )  # no flush delay
    return aggregator, repo


def test_aggregate_to_1T_basic(agg):
    aggregator, repo = agg
    asset_cache = {"AAPL": 1}
    asset_class_cache = {1: "us_equity"}
    ts = datetime(2025, 8, 8, 14, 30, tzinfo=UTC)
    ticks = [
        {"S": "AAPL", "p": 150.0, "s": 10, "t": ts.isoformat()},
        {"S": "AAPL", "p": 151.0, "s": 5, "t": ts.isoformat()},
    ]

    m1_map, latest = aggregator.aggregate_to_1T(
        ticks, asset_cache, asset_class_cache, lambda _: True
    )
    assert latest == ts
    assert len(m1_map) == 1
    key = (1, ts.replace(second=0, microsecond=0))
    c = m1_map[key]
    assert c["open"] == 150.0
    assert c["high"] == 151.0
    assert c["low"] == 150.0
    assert c["close"] == 151.0
    assert c["volume"] == 15


def test_persist_1T_creates_new(agg):
    aggregator, repo = agg
    ts = datetime(2025, 8, 8, 14, 30, tzinfo=UTC)
    m1_map = {
        (1, ts): {"open": 150, "high": 151, "low": 149, "close": 150.5, "volume": 100}
    }
    aggregator.persist_1T(m1_map)
    assert len(repo.created) == 1
    assert repo.created[0].asset_id == 1
    assert repo.created[0].open == 150


def test_rollup_and_persist_open_closed(agg):
    aggregator, repo = agg
    base_ts = datetime(2025, 8, 8, 14, 30, tzinfo=UTC)
    m1_map = {
        (1, base_ts): {"open": 150, "high": 150, "low": 150, "close": 150, "volume": 10}
    }
    touched = aggregator.rollup_higher_timeframes(m1_map)

    # Persist open buckets (should create because flush delay is 0)
    aggregator.persist_open_buckets(touched, base_ts)
    assert len(repo.created) > 0

    # Add a closed bucket and flush
    old_bucket = base_ts - timedelta(minutes=10)
    aggregator._tf_acc["5T"][(1, old_bucket)] = {
        "open": 1,
        "high": 2,
        "low": 1,
        "close": 2,
        "volume": 5,
    }
    aggregator.flush_closed_buckets(base_ts)
    assert len(repo.created) > 0
