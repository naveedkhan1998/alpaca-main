from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import time

from django.core.cache import cache
from django.utils import timezone

from apps.core.models import Candle, WatchListAsset
from apps.core.services.backfill_coordinator import request_backfill
from main import const
from main.cache_keys import cache_keys


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
                    Candle.objects.filter(asset_id=asset_id, timeframe=const.TF_1T)
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
                # Be resilient in the streaming loop; log at call site
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
                try:
                    request_backfill(asset_id, source="websocket-service")
                finally:
                    # Record local cooldown regardless of coordinator result
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
        # If running flag present, treat as not complete
        running_key = cache_keys.backfill(asset_id).running()
        try:
            if cache.get(running_key):
                return False
        except Exception:
            # If cache fails, assume not running and continue heuristic checks
            pass

        # If explicit completion flag is set, allow
        completion_key = cache_keys.backfill(asset_id).completed()
        try:
            if cache.get(completion_key):
                return True
        except Exception:
            # If cache fails, fall through to heuristics
            pass

        latest_1t = (
            Candle.objects.filter(asset_id=asset_id, timeframe=const.TF_1T)
            .order_by("-timestamp")
            .first()
        )
        if not latest_1t:
            return False

        now_dt = timezone.now()
        coverage_threshold = now_dt - timedelta(days=4)
        earliest_1t = (
            Candle.objects.filter(asset_id=asset_id, timeframe=const.TF_1T)
            .order_by("timestamp")
            .first()
        )
        if not earliest_1t or earliest_1t.timestamp > coverage_threshold:
            return False

        # Heuristic: higher TF has some historical rows (not just today)
        historical_threshold = now_dt.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) - timedelta(days=1)
        exists = Candle.objects.filter(
            asset_id=asset_id, timeframe=timeframe, timestamp__lt=historical_threshold
        ).exists()
        return exists
