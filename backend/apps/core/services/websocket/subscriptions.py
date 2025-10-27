from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
import threading

from django.db import close_old_connections

from apps.core.models import Asset, WatchListAsset

SendFn = Callable[[str, list[str]], None]


@dataclass
class SubscriptionManager:
    """Tracks active subscriptions and reconciles them against watchlists."""

    send: SendFn
    on_assets_added: Callable[[set[str]], None]

    # runtime state
    subscribed_symbols: set[str] = field(default_factory=set)
    asset_cache: dict[str, int] = field(default_factory=dict)  # symbol -> id
    asset_class_cache: dict[int, str] = field(default_factory=dict)  # id -> class

    # locks
    _sub_lock: threading.Lock = field(default_factory=threading.Lock, init=False)
    _asset_lock: threading.Lock = field(default_factory=threading.Lock, init=False)

    def get_watchlist_symbols(self) -> set[str]:
        symbols = set(
            WatchListAsset.objects.filter(
                watchlist__is_active=True, is_active=True
            ).values_list("asset__symbol", flat=True)
        )
        return symbols

    def update_asset_cache(self, symbols: Iterable[str]) -> None:
        assets = Asset.objects.filter(symbol__in=symbols).values(
            "symbol", "id", "asset_class"
        )
        with self._asset_lock:
            new_mappings = {a["symbol"]: a["id"] for a in assets}
            self.asset_cache.update(new_mappings)
            for a in assets:
                self.asset_class_cache[a["id"]] = a["asset_class"]

        # callback to allow client to schedule backfill, clear accumulators, etc.
        if new_mappings:
            self.on_assets_added(set(new_mappings.keys()))

    def reconcile(self) -> None:
        """Reconcile desired (watchlists) vs actual subscriptions."""
        close_old_connections()
        current = self.get_watchlist_symbols()
        with self._sub_lock:
            new = current - self.subscribed_symbols
            gone = self.subscribed_symbols - current

            if new:
                self.send("subscribe", list(new))
                self.subscribed_symbols.update(new)
                self.update_asset_cache(new)

            if gone:
                self.send("unsubscribe", list(gone))
                self.subscribed_symbols -= gone
