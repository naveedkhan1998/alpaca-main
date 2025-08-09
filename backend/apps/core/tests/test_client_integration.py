from datetime import UTC, datetime

import pytest

from apps.core.services.websocket.client import WebsocketClient
from apps.core.services.websocket.repository import MarketRepository


# ---------------- Fake Repo ----------------
class FakeRepo(MarketRepository):
    def __init__(self):
        self.created = []
        self.updated = []
        self.active_symbols = {"AAPL"}
        self.assets = [{"symbol": "AAPL", "id": 1, "asset_class": "us_equity"}]
        self.latest_candle = None

    def get_active_symbols(self):
        return self.active_symbols

    def get_assets(self, symbols):
        return self.assets

    def get_latest_candle(self, asset_id, timeframe):
        return self.latest_candle

    def get_existing_candles(self, asset_ids, timestamps, timeframe):
        return []  # always new

    def bulk_create_candles(self, candles):
        self.created.extend(candles)

    def bulk_update_candles(self, candles, fields):
        self.updated.extend(candles)


# ---------------- Fixture ----------------
@pytest.fixture
def client(monkeypatch):
    # Patch DB for AlpacaAccount
    monkeypatch.setattr(
        "apps.core.services.websocket.client.AlpacaAccount.objects.get",
        lambda id: type("Acct", (), {"api_key": "key", "api_secret": "secret"})(),
    )
    # Instantiate client with fake repo
    c = WebsocketClient(account_id=1, sandbox=True)
    fake_repo = FakeRepo()
    c.repo = fake_repo
    c.sub_manager.repo = fake_repo
    c.aggregator.repo = fake_repo
    return c, fake_repo


# ---------------- Test ----------------
def test_batch_loop_end_to_end(client):
    ws_client, repo = client

    # Prepare a fake tick for 1T candle
    ts = datetime(2025, 8, 8, 14, 30, tzinfo=UTC)
    tick = {"S": "AAPL", "p": 150.0, "s": 10, "t": ts.isoformat()}
    ws_client.asset_cache["AAPL"] = 1
    ws_client.asset_class_cache[1] = "us_equity"
    ws_client.tick_buffer.put(tick)

    # Run one iteration of batch loop manually
    ticks = ws_client._drain_ticks()
    m1_map, latest = ws_client.aggregator.aggregate_to_1T(
        ticks, ws_client.asset_cache, ws_client.asset_class_cache, ws_client._is_rth
    )
    ws_client.aggregator.persist_1T(m1_map)
    touched = ws_client.aggregator.rollup_higher_timeframes(m1_map)
    ws_client.aggregator.persist_open_buckets(touched, latest)
    ws_client.aggregator.flush_closed_buckets(latest)

    # Assertions
    assert len(repo.created) > 0, "No candles were persisted"
    candle = repo.created[0]
    assert candle.asset_id == 1
    assert candle.open == 150.0
    assert candle.high == 150.0
    assert candle.low == 150.0
    assert candle.close == 150.0
    assert candle.volume == 10
