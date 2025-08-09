from __future__ import annotations

import logging
import threading

from django.utils import timezone

from .repository import MarketRepository

logger = logging.getLogger(__name__)


class SubscriptionManager:
    """Handles watchlist diffing and symbol/asset caching."""

    def __init__(
        self,
        repo: MarketRepository,
        asset_cache: dict[str, int],
        asset_class_cache: dict[int, str],
        asset_lock: threading.Lock,
    ) -> None:
        self.repo = repo
        self.asset_cache = asset_cache
        self.asset_class_cache = asset_class_cache
        self.asset_lock = asset_lock

    def diff_subscriptions(
        self, current_subscribed: set[str]
    ) -> tuple[set[str], set[str]]:
        current = self.repo.get_active_symbols()
        new = current - current_subscribed
        gone = current_subscribed - current
        return new, gone

    def update_asset_cache(self, symbols: set[str]) -> None:
        assets = self.repo.get_assets(symbols)
        with self.asset_lock:
            for a in assets:
                self.asset_cache[a["symbol"]] = a["id"]  # type: ignore
                self.asset_class_cache[a["id"]] = a["asset_class"]  # type: ignore

        # Warn about stale 1T candles
        for symbol in symbols:
            asset_id = self.asset_cache.get(symbol)
            if asset_id:
                latest = self.repo.get_latest_candle(asset_id, "1T")
                if latest:
                    age = timezone.now() - latest.timestamp
                    if age.total_seconds() > 120:
                        logger.warning(
                            "Asset %s latest 1T candle is %s old. Historical fetch may be needed.",
                            symbol,
                            age,
                        )
