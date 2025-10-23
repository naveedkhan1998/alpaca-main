from __future__ import annotations

import logging

from django.core.cache import cache

from apps.core.tasks import fetch_historical_data
from main.cache_keys import cache_keys

logger = logging.getLogger(__name__)

TTL_SECONDS = 60 * 10  # 10 minutes


def request_backfill(
    asset_id: int,
    *,
    source: str = "unknown",
    queued_ttl_seconds: int = TTL_SECONDS,
) -> bool:
    """
    Idempotently enqueue a historical backfill for an asset.

    Uses a per-asset queued lock so multiple callers (websocket, views, etc.) do not
    enqueue duplicate work across processes. The actual task also enforces a per-asset
    running lock for double safety.

    Returns True when a backfill was scheduled, False if skipped due to existing queued lock.
    """
    asset_id = asset_id
    key = cache_keys.backfill(asset_id=asset_id).queued()
    if not cache.add(key, 1, timeout=queued_ttl_seconds):
        logger.info(
            "Backfill already queued for asset_id=%s (source=%s) — skipping",
            asset_id,
            source,
        )
        return False

    # Queue the job
    fetch_historical_data.delay(asset_id)
    logger.info(
        "Backfill scheduled for asset_id=%s by %s",
        asset_id,
        source,
    )
    return True
