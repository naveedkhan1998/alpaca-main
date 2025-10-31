from unittest.mock import Mock

import pytest

from apps.core.models import Asset, WatchList, WatchListAsset
from apps.core.services.websocket.subscriptions import SubscriptionManager


@pytest.mark.django_db
class TestSubscriptionManager:
    """Test subscription management logic."""

    def setup_method(self):
        """Set up test data."""
        self.mock_send = Mock()
        self.mock_on_assets_added = Mock()
        self.manager = SubscriptionManager(
            send=self.mock_send, on_assets_added=self.mock_on_assets_added
        )

        # Create test assets
        self.asset1 = Asset.objects.create(
            alpaca_id="asset-1",
            symbol="AAPL",
            name="Apple Inc",
            asset_class="us_equity",
        )
        self.asset2 = Asset.objects.create(
            alpaca_id="asset-2", symbol="BTC/USD", name="Bitcoin", asset_class="crypto"
        )

    def test_get_watchlist_symbols_no_watchlists(self):
        """Test getting symbols when no active watchlists exist."""
        symbols = self.manager.get_watchlist_symbols()
        assert symbols == set()

    def test_get_watchlist_symbols_inactive_watchlist(self):
        """Test getting symbols from inactive watchlist."""
        watchlist = WatchList.objects.create(name="Test", is_active=False)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset1, is_active=True
        )

        symbols = self.manager.get_watchlist_symbols()
        assert symbols == set()

    def test_get_watchlist_symbols_inactive_asset(self):
        """Test getting symbols when asset is inactive."""
        watchlist = WatchList.objects.create(name="Test", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset1, is_active=False
        )

        symbols = self.manager.get_watchlist_symbols()
        assert symbols == set()

    def test_get_watchlist_symbols_active_watchlist(self):
        """Test getting symbols from active watchlist."""
        watchlist = WatchList.objects.create(name="Test", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset1, is_active=True
        )
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset2, is_active=True
        )

        symbols = self.manager.get_watchlist_symbols()
        assert symbols == {"AAPL", "BTC/USD"}

    def test_get_watchlist_symbols_multiple_watchlists(self):
        """Test getting symbols from multiple active watchlists."""
        watchlist1 = WatchList.objects.create(name="Test1", is_active=True)
        watchlist2 = WatchList.objects.create(name="Test2", is_active=True)

        WatchListAsset.objects.create(
            watchlist=watchlist1, asset=self.asset1, is_active=True
        )
        WatchListAsset.objects.create(
            watchlist=watchlist2, asset=self.asset2, is_active=True
        )

        symbols = self.manager.get_watchlist_symbols()
        assert symbols == {"AAPL", "BTC/USD"}

    def test_update_asset_cache(self):
        """Test updating asset cache with symbols."""
        symbols = ["AAPL", "BTC/USD"]

        self.manager.update_asset_cache(symbols)

        assert self.manager.asset_cache == {
            "AAPL": self.asset1.id,
            "BTC/USD": self.asset2.id,
        }
        assert self.manager.asset_class_cache == {
            self.asset1.id: "us_equity",
            self.asset2.id: "crypto",
        }
        self.mock_on_assets_added.assert_called_once_with({"AAPL", "BTC/USD"})

    def test_update_asset_cache_partial_matches(self):
        """Test updating cache when some symbols don't exist."""
        symbols = ["AAPL", "NONEXISTENT"]

        self.manager.update_asset_cache(symbols)

        assert self.manager.asset_cache == {"AAPL": self.asset1.id}
        assert self.manager.asset_class_cache == {self.asset1.id: "us_equity"}
        self.mock_on_assets_added.assert_called_once_with({"AAPL"})

    def test_update_asset_cache_empty_symbols(self):
        """Test updating cache with empty symbols."""
        self.manager.update_asset_cache([])

        assert self.manager.asset_cache == {}
        assert self.manager.asset_class_cache == {}
        # on_assets_added should not be called when no new assets
        self.mock_on_assets_added.assert_not_called()

    def test_reconcile_no_changes(self):
        """Test reconcile when subscriptions match watchlist."""
        # Set up watchlist
        watchlist = WatchList.objects.create(name="Test", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset1, is_active=True
        )

        # Set current subscriptions to match
        self.manager.subscribed_symbols = {"AAPL"}
        self.manager.asset_cache = {"AAPL": self.asset1.id}
        self.manager.asset_class_cache = {self.asset1.id: "us_equity"}

        self.manager.reconcile()

        # Should not call send since no changes
        self.mock_send.assert_not_called()

    def test_reconcile_new_subscriptions(self):
        """Test reconcile when new symbols need subscription."""
        # Set up watchlist
        watchlist = WatchList.objects.create(name="Test", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset1, is_active=True
        )

        # Start with no subscriptions
        self.manager.subscribed_symbols = set()

        self.manager.reconcile()

        # Should call send with subscribe and update cache
        self.mock_send.assert_called_once_with("subscribe", ["AAPL"])
        assert self.manager.subscribed_symbols == {"AAPL"}
        assert "AAPL" in self.manager.asset_cache

    def test_reconcile_removed_subscriptions(self):
        """Test reconcile when symbols need to be unsubscribed."""
        # Start with subscription that's no longer in watchlist
        self.manager.subscribed_symbols = {"AAPL"}
        self.manager.asset_cache = {"AAPL": self.asset1.id}
        self.manager.asset_class_cache = {self.asset1.id: "us_equity"}

        # Empty watchlist
        self.manager.reconcile()

        # Should call send with unsubscribe
        self.mock_send.assert_called_once_with("unsubscribe", ["AAPL"])
        assert self.manager.subscribed_symbols == set()

    def test_reconcile_mixed_changes(self):
        """Test reconcile with both additions and removals."""
        # Set up watchlist with asset2
        watchlist = WatchList.objects.create(name="Test", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset2, is_active=True
        )

        # Start with asset1 subscribed
        self.manager.subscribed_symbols = {"AAPL"}
        self.manager.asset_cache = {"AAPL": self.asset1.id}
        self.manager.asset_class_cache = {self.asset1.id: "us_equity"}

        self.manager.reconcile()

        # Should unsubscribe from AAPL and subscribe to BTC/USD
        assert self.mock_send.call_count == 2
        self.mock_send.assert_any_call("unsubscribe", ["AAPL"])
        self.mock_send.assert_any_call("subscribe", ["BTC/USD"])
        assert self.manager.subscribed_symbols == {"BTC/USD"}

    def test_reconcile_updates_asset_cache(self):
        """Test that reconcile updates asset cache for new subscriptions."""
        # Set up watchlist
        watchlist = WatchList.objects.create(name="Test", is_active=True)
        WatchListAsset.objects.create(
            watchlist=watchlist, asset=self.asset1, is_active=True
        )

        self.manager.reconcile()

        # Should have populated asset cache
        assert self.manager.asset_cache["AAPL"] == self.asset1.id
        assert self.manager.asset_class_cache[self.asset1.id] == "us_equity"

    def test_reconcile_exception_handling(self):
        """Test exception handling in reconcile."""
        # Mock get_watchlist_symbols to raise exception
        with pytest.raises(ValueError):
            original_get = self.manager.get_watchlist_symbols
            self.manager.get_watchlist_symbols = Mock(
                side_effect=ValueError("DB error")
            )

            try:
                self.manager.reconcile()
            finally:
                self.manager.get_watchlist_symbols = original_get

    def test_thread_safety(self):
        """Test that operations are thread-safe with locks."""
        # The locks should exist
        assert hasattr(self.manager, "_sub_lock")
        assert hasattr(self.manager, "_asset_lock")

        # They should be threading.Lock instances
        assert self.manager._sub_lock is not None
        assert self.manager._asset_lock is not None

    def test_asset_class_caching(self):
        """Test that asset classes are properly cached."""
        symbols = ["AAPL", "BTC/USD"]

        self.manager.update_asset_cache(symbols)

        # Check that both asset classes are cached
        assert self.manager.asset_class_cache[self.asset1.id] == "us_equity"
        assert self.manager.asset_class_cache[self.asset2.id] == "crypto"
