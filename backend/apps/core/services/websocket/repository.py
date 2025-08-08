from __future__ import annotations
from typing import Iterable, Optional
from datetime import datetime
from apps.core.models import Asset, Candle, WatchListAsset


class MarketRepository:
    """Encapsulates all ORM operations for easy testing/mocking."""

    def get_active_symbols(self) -> set[str]:
        return set(
            WatchListAsset.objects.filter(
                watchlist__is_active=True, is_active=True
            ).values_list("asset__symbol", flat=True)
        )

    def get_assets(self, symbols: Iterable[str]) -> list[dict[str, object]]:
        return list(
            Asset.objects.filter(symbol__in=symbols).values(
                "symbol", "id", "asset_class"
            )
        )

    def get_latest_candle(self, asset_id: int, timeframe: str) -> Optional[Candle]:
        return (
            Candle.objects.filter(asset_id=asset_id, timeframe=timeframe)
            .order_by("-timestamp")
            .first()
        )

    def get_existing_candles(
        self, asset_ids: Iterable[int], timestamps: Iterable[datetime], timeframe: str
    ) -> list[Candle]:
        return list(
            Candle.objects.filter(
                asset_id__in=asset_ids,
                timestamp__in=timestamps,
                timeframe=timeframe,
            )
        )

    def bulk_create_candles(self, candles: list[Candle]) -> None:
        Candle.objects.bulk_create(candles, ignore_conflicts=True)

    def bulk_update_candles(self, candles: list[Candle], fields: list[str]) -> None:
        Candle.objects.bulk_update(candles, fields)
