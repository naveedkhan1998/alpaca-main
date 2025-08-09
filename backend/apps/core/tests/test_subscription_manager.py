import threading

import pytest

from apps.core.services.websocket.repository import MarketRepository
from apps.core.services.websocket.subscription import SubscriptionManager


class FakeRepo(MarketRepository):
    def __init__(self, active_symbols=None, assets=None, latest=None):
        self._active_symbols = active_symbols or set()
        self._assets = assets or []
        self._latest = latest

    def get_active_symbols(self):
        return self._active_symbols

    def get_assets(self, symbols):
        return self._assets

    def get_latest_candle(self, asset_id, timeframe):
        return self._latest


@pytest.fixture
def manager():
    asset_cache = {}
    asset_class_cache = {}
    lock = threading.Lock()
    repo = FakeRepo(
        active_symbols={"AAPL", "TSLA"},
        assets=[{"symbol": "AAPL", "id": 1, "asset_class": "us_equity"}],
    )
    mgr = SubscriptionManager(repo, asset_cache, asset_class_cache, lock)
    return mgr, repo, asset_cache, asset_class_cache


def test_diff_subscriptions(manager):
    mgr, _, _, _ = manager
    current_subscribed = {"AAPL"}
    new, gone = mgr.diff_subscriptions(current_subscribed)
    assert new == {"TSLA"}
    assert gone == set()


def test_update_asset_cache(manager):
    mgr, _, asset_cache, asset_class_cache = manager
    mgr.update_asset_cache({"AAPL"})
    assert asset_cache["AAPL"] == 1
    assert asset_class_cache[1] == "us_equity"
