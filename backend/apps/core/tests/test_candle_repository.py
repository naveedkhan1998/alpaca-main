from datetime import UTC, datetime, timedelta
from decimal import Decimal
import os
from unittest.mock import MagicMock, patch

import pytest

from apps.core.services.candle_repository import CandleRepository
from apps.core.services.websocket.aggregator import TimeframeAggregator
from apps.core.services.websocket.persistence import CandlePersistence


@pytest.mark.parametrize("aggregated", [False, True])
def test_snapshot_sql_replaces_all_fields(aggregated):
    repo = CandleRepository()
    connection = MagicMock()
    with patch("apps.core.services.candle_repository.connection", connection):
        candle = {
            "asset_id": 1,
            "timestamp": datetime(2026, 10, 8, tzinfo=UTC),
            "open": 100,
            "high": 101,
            "low": 99,
            "close": 100,
            "volume": 10,
        }
        if aggregated:
            repo.upsert_aggregated_candles("5T", [candle], mode="snapshot")
        else:
            repo.upsert_minute_candles([candle], mode="snapshot")
    sql = connection.cursor.return_value.__enter__.return_value.execute.call_args.args[
        0
    ]
    update = sql.split("DO UPDATE SET")[1]
    for field in ("open", "high", "low", "close", "volume", "trade_count", "vwap"):
        assert f"{field} = EXCLUDED.{field}" in update
    assert "GREATEST" not in update
    assert "LEAST" not in update


def test_database_rollup_includes_full_bucket_and_handles_late_updates():
    repo = MagicMock(spec=CandlePersistence)
    guard = MagicMock()
    guard.is_historical_complete.return_value = True
    aggregator = TimeframeAggregator(
        repo=repo,
        backfill=guard,
        tf_cfg={"1T": timedelta(minutes=1), "5T": timedelta(minutes=5)},
        database_rollup=True,
        open_flush_secs=0,
    )
    minute = datetime(2026, 10, 8, 14, 32, tzinfo=UTC)
    touched = aggregator.rollup_from_minutes({(1, minute): {"volume": 10}})
    aggregator.persist_open(touched, minute)
    start = minute.replace(minute=30)
    repo.aggregate_to_timeframe.assert_called_once_with(
        1, "5T", start, start + timedelta(minutes=5)
    )
    aggregator.persist_open(touched, start + timedelta(minutes=10))
    assert repo.aggregate_to_timeframe.call_count == 2
    repo.upsert_aggregated.assert_not_called()


def test_failed_closed_rollup_keeps_bucket_for_retry():
    repo = MagicMock(spec=CandlePersistence)
    guard = MagicMock()
    guard.is_historical_complete.return_value = True
    aggregator = TimeframeAggregator(
        repo=repo,
        backfill=guard,
        tf_cfg={"5T": timedelta(minutes=5)},
        database_rollup=True,
    )
    start = datetime(2026, 10, 8, 14, 30, tzinfo=UTC)
    aggregator.rollup_from_minutes({(1, start): {}})
    repo.aggregate_to_timeframe.side_effect = RuntimeError("DB unavailable")
    with pytest.raises(RuntimeError):
        aggregator.flush_closed(start + timedelta(minutes=5))
    assert (1, start) in aggregator._tf_acc["5T"]


@pytest.fixture
def postgres_connection():
    """Optional real PostgreSQL coverage using session-local temporary tables."""
    dsn = os.getenv("MARKET_DATA_TEST_POSTGRES_DSN")
    if not dsn:
        pytest.skip("MARKET_DATA_TEST_POSTGRES_DSN is not set")
    import psycopg2

    connection = psycopg2.connect(dsn)
    try:
        with connection.cursor() as cursor:
            fields = """
                asset_id integer NOT NULL, timestamp timestamptz NOT NULL,
                open numeric, high numeric, low numeric, close numeric,
                volume numeric, trade_count integer, vwap numeric, created_at timestamptz
            """
            cursor.execute(
                f"CREATE TEMP TABLE core_minute_candle ({fields}, UNIQUE(asset_id, timestamp))"
            )
            cursor.execute(
                f"CREATE TEMP TABLE core_aggregated_candle ({fields}, timeframe text, UNIQUE(asset_id, timeframe, timestamp))"
            )
        with patch("apps.core.services.candle_repository.connection", connection):
            yield connection
    finally:
        connection.rollback()
        connection.close()


def test_postgres_corrections_rollups_and_idempotency(postgres_connection):
    repo = CandleRepository()
    start = datetime(2026, 10, 8, 14, 30, tzinfo=UTC)
    first = {
        "asset_id": 1,
        "timestamp": start,
        "open": 100,
        "high": 999,
        "low": 1,
        "close": 101,
        "volume": Decimal("0.12345678"),
        "trade_count": 5,
        "vwap": 100,
    }
    second = {
        **first,
        "timestamp": start + timedelta(minutes=1),
        "open": 101,
        "high": 102,
        "low": 100,
        "close": 102,
        "volume": Decimal("0.2"),
    }
    repo.upsert_minute_candles([first, second], mode="snapshot")
    corrected = {
        **first,
        "open": 99,
        "high": 101,
        "low": 99,
        "volume": Decimal("0.1"),
        "trade_count": 2,
        "vwap": 99,
    }
    repo.upsert_minute_candles([corrected], mode="snapshot")
    repo.upsert_minute_candles([corrected], mode="snapshot")
    repo.aggregate_to_timeframe(
        1, "5T", start + timedelta(minutes=1), start + timedelta(minutes=5)
    )
    with postgres_connection.cursor() as cursor:
        cursor.execute(
            "SELECT timestamp, open, high, low, close, volume, trade_count FROM core_aggregated_candle"
        )
        assert cursor.fetchone() == (start, 99, 102, 99, 102, Decimal("0.3"), 7)
    second["high"] = 101
    second["close"] = 100
    second["volume"] = Decimal("0.05")
    repo.upsert_minute_candles([second], mode="snapshot")
    repo.aggregate_to_timeframe(1, "5T", start, start + timedelta(minutes=5))
    with postgres_connection.cursor() as cursor:
        cursor.execute("SELECT high, close, volume FROM core_aggregated_candle")
        assert cursor.fetchone() == (101, 100, Decimal("0.15"))
