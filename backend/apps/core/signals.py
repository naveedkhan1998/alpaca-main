from __future__ import annotations

import logging

from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.core.models import AggregatedCandle, Candle, MinuteCandle, WatchListAsset

logger = logging.getLogger(__name__)


@receiver(post_delete, sender=WatchListAsset)
def cleanup_asset_after_last_watchlist_asset(
    sender, instance: WatchListAsset, **kwargs
):
    """When the last WatchListAsset for an Asset is removed, purge its candles.

    - Do NOT delete the Asset itself
    - Websocket client will naturally unsubscribe within its next reconciliation
      since the asset will no longer be present in active watchlists
    """
    asset_id = instance.asset_id
    if not WatchListAsset.objects.filter(asset_id=asset_id).exists():
        deleted, _ = Candle.objects.filter(asset_id=asset_id).delete()
        logger.info(
            "Removed last WatchListAsset for asset_id=%s; deleted %s candles",
            asset_id,
            deleted,
        )
        deleted, _ = MinuteCandle.objects.filter(asset_id=asset_id).delete()
        logger.info(
            "Removed last WatchListAsset for asset_id=%s; deleted %s 1-minute candles",
            asset_id,
            deleted,
        )
        deleted, _ = AggregatedCandle.objects.filter(asset_id=asset_id).delete()
        logger.info(
            "Removed last WatchListAsset for asset_id=%s; deleted %s aggregated candles",
            asset_id,
            deleted,
        )
