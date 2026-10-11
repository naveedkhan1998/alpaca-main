from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging
import time

from django.core.cache import cache
from django.utils import timezone

from apps.core.models import AggregatedCandle, MinuteCandle, WatchListAsset
from apps.core.services.backfill_coordinator import request_backfill
from main.cache_keys import cache_keys

logger = logging.getLogger(__name__)


@dataclass
class BackfillGuard:
    """Encapsulates backfill completion checks and scheduling cooldowns."""

    schedule_backfill: Callable[[int], None]
    cooldown_secs: int = 900  # 15 minutes per asset
    gap_threshold_secs: int = 300  # consider stale if older than 5 min
    _last_request: dict[int, float] = field(default_factory=dict)

    def maybe_schedule_for_assets(self, asset_ids: list[int]) -> set[int]:
        now_s = time.time()
        scheduled: set[int] = set()
        for asset_id in asset_ids:
            try:
                latest_candle = (
                    MinuteCandle.objects.filter(asset_id=asset_id)
                    .order_by("-timestamp")
                    .first()
                )
                if not latest_candle:
                    # No data yet — schedule once immediately
                    if self._maybe_schedule(asset_id, now_s):
                        scheduled.add(asset_id)
                    continue

                now_dt = timezone.now()
                age_s = (now_dt - latest_candle.timestamp).total_seconds()
                if age_s > self.gap_threshold_secs:
                    if self._maybe_schedule(asset_id, now_s):
                        scheduled.add(asset_id)
            except Exception:
                logger.exception("Failed to check backfill for asset_id=%s", asset_id)
                continue
        return scheduled

    def _maybe_schedule(self, asset_id: int, now_s: float) -> bool:
        last_req = self._last_request.get(asset_id, 0.0)
        if now_s - last_req >= self.cooldown_secs:
            # schedule per watchlist asset to mirror historical behavior
            wla_ids = list(
                WatchListAsset.objects.filter(
                    watchlist__is_active=True, is_active=True, asset_id=asset_id
                ).values_list("id", flat=True)
            )
            if wla_ids:
                # Use centralized coordinator for idempotent scheduling
                request_backfill(asset_id, source="websocket-service")
                self._last_request[asset_id] = now_s
                return True
        return False

    def is_historical_complete(
        self, asset_id: int, timeframe: str, bucket_ts: datetime
    ) -> bool:
        """Check if historical backfill is complete for this asset/timeframe.

        Prevents creating partial higher timeframe candles that would interfere
        with proper offline backfill.
        """
        # Queued work also owns the history until it completes.
        running_key = cache_keys.backfill(asset_id).running()
        try:
            if cache.get(running_key) or cache.get(
                cache_keys.backfill(asset_id).queued()
            ):
                return False
        except Exception:
            logger.exception(
                "Unable to check backfill ownership for asset_id=%s", asset_id
            )
            return False

        # If explicit completion flag is set, allow
        completion_key = cache_keys.backfill(asset_id).completed()
        try:
            if cache.get(completion_key):
                return True
        except Exception:
            logger.exception(
                "Unable to check backfill completion for asset_id=%s", asset_id
            )
            return False

        latest_1t = (
            MinuteCandle.objects.filter(asset_id=asset_id)
            .order_by("-timestamp")
            .first()
        )
        if not latest_1t:
            return False

        now_dt = timezone.now()
        coverage_threshold = now_dt - timedelta(days=4)
        earliest_1t = (
            MinuteCandle.objects.filter(asset_id=asset_id).order_by("timestamp").first()
        )
        if not earliest_1t or earliest_1t.timestamp > coverage_threshold:
            return False

        # Heuristic: higher TF has some historical rows (not just today)
        historical_threshold = now_dt.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - timedelta(days=1)
        exists = AggregatedCandle.objects.filter(
            asset_id=asset_id, timeframe=timeframe, timestamp__lt=historical_threshold
        ).exists()
        return exists
