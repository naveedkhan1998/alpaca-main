from __future__ import annotations

import logging

from django.core.cache import cache

from apps.core.models import WatchListAsset
from apps.core.tasks import fetch_historical_data

logger = logging.getLogger(__name__)


def request_backfill(
    watchlist_asset_id: int,
    *,
    source: str = "unknown",
    queued_ttl_seconds: int = 60 * 60,  # 1 hour
) -> bool:
    """Idempotently enqueue a historical backfill for the asset of this watchlist asset.

    Uses a per-asset queued lock so multiple callers (websocket, views, etc.) do not
    enqueue duplicate work across processes. The actual task also enforces a per-asset
    running lock for double safety.

    Returns True when a backfill was scheduled, False if skipped due to existing queued lock
    or missing WatchListAsset.
    """
    wla = (
        WatchListAsset.objects.filter(id=watchlist_asset_id)
        .select_related("asset", "watchlist__user")
        .first()
    )
    if not wla:
        logger.warning(
            "Backfill request skipped: WatchListAsset %s not found (source=%s)",
            watchlist_asset_id,
            source,
        )
        return False

    asset_id = wla.asset_id
    key = f"backfill:queued:{asset_id}"
    if not cache.add(key, 1, timeout=queued_ttl_seconds):
        logger.info(
            "Backfill already queued for asset_id=%s (source=%s) — skipping",
            asset_id,
            source,
        )
        return False

    # Queue the job
    fetch_historical_data.delay(watchlist_asset_id)
    logger.info(
        "Backfill scheduled for asset_id=%s symbol=%s by %s",
        asset_id,
        wla.asset.symbol,
        source,
    )
    return True
