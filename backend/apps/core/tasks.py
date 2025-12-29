from datetime import datetime, time, timedelta

from celery import Task, shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import pytz

from apps.core.models import (
    Asset,
    Candle,
    MinuteCandle,
    AggregatedCandle,
    WatchListAsset,
)
from apps.core.services.candle_repository import CandleRepository
from main import const
from main.cache_keys import cache_keys

from .services.alpaca_service import alpaca_service

logger = get_task_logger(__name__)


LOCK_TTL = 300  # 5 minutes
LOCK_WAIT = 5  # seconds to wait for lock
RETRY_MAX = None  # unlimited
RETRY_BACKOFF = True
RETRY_BACKOFF_MAX = 300  # cap 5 min


class SingleInstanceTask(Task):
    """Custom task class that prevents multiple instances of the same task"""

    def apply_async(self, args=None, kwargs=None, task_id=None, **options):
        # Generate a unique task_id based on task + logical entity to prevent duplicates
        # Note: we scope keys differently per task type
        key_suffix = None
        if args and len(args) > 0:
            arg0 = args[0]
            try:
                if self.name == "fetch_historical_data":
                    # arg0 is watchlist_asset_id → resolve to asset_id to serialize per-asset
                    wla = (
                        WatchListAsset.objects.filter(id=arg0)
                        .values("asset_id")
                        .first()
                    )
                    if wla:
                        key_suffix = f"asset-{wla['asset_id']}"
                    else:
                        key_suffix = f"watchlist-asset-{arg0}"
                elif self.name == "alpaca_sync" or self.name == "start_alpaca_stream":
                    key_suffix = f"account-{arg0}"
                else:
                    key_suffix = f"arg0-{arg0}"
            except Exception:
                key_suffix = f"arg0-{arg0}"
        if key_suffix:
            task_id = f"{self.name}-{key_suffix}"

        # Check if task is already running
        from celery import current_app

        active_tasks = current_app.control.inspect().active()

        if active_tasks:
            for worker, tasks in active_tasks.items():
                for task in tasks:
                    if task.get("id") == task_id:
                        logger.warning(
                            f"Task {task_id} is already running on worker {worker}. Skipping new instance."
                        )
                        return None

        return super().apply_async(args, kwargs, task_id=task_id, **options)


@shared_task(name="alpaca_sync", base=SingleInstanceTask)
def alpaca_sync_task(asset_classes: list = None, batch_size: int = 1000):
    """
    Optimized sync task that efficiently syncs assets from Alpaca API.

    Args:
        asset_classes: List of asset classes to sync (defaults to all: ["us_equity", "us_option", "crypto"])
        batch_size: Number of assets to process in each batch
    """
    if asset_classes is None:
        asset_classes = ["us_equity", "us_option", "crypto"]

    try:
        from django.utils import timezone

        from apps.core.models import SyncStatus

        # Get or create sync status for assets
        sync_status, created = SyncStatus.objects.get_or_create(
            sync_type="assets", defaults={"total_items": 0, "is_syncing": True}
        )

        # Mark as syncing
        sync_status.is_syncing = True
        sync_status.save()

        service = alpaca_service

        total_created = 0
        total_updated = 0
        total_errors = 0

        # Process each asset class
        for asset_class in asset_classes:
            logger.info(f"Starting sync for asset class: {asset_class}")

            try:
                # Fetch assets from Alpaca with fallback for data-only keys
                fallback_symbols = (
                    ["AAPL", "GOOGL", "MSFT", "TSLA", "NVDA"]
                    if asset_class == "us_equity"
                    else None
                )

                assets_data = service.list_assets(
                    status="active",
                    asset_class=asset_class,
                    fallback_symbols=fallback_symbols,
                )

                if not assets_data:
                    logger.warning(f"No assets returned for asset class: {asset_class}")
                    continue

                logger.info(f"Fetched {len(assets_data)} assets for {asset_class}")

                # Get existing assets in batches to avoid memory issues
                existing_alpaca_ids = set(
                    Asset.objects.filter(asset_class=asset_class).values_list(
                        "alpaca_id", flat=True
                    )
                )

                assets_to_create = []
                assets_to_update = []

                # Separate assets into create vs update batches
                for asset_data in assets_data:
                    alpaca_id = asset_data.get("id", asset_data["symbol"])

                    asset_dict = {
                        "alpaca_id": alpaca_id,
                        "symbol": asset_data["symbol"],
                        "name": asset_data.get("name", ""),
                        "asset_class": asset_data.get("class", asset_class),
                        "exchange": asset_data.get("exchange"),
                        "status": asset_data.get("status", "active"),
                        "tradable": asset_data.get("tradable", False),
                        "marginable": asset_data.get("marginable", False),
                        "shortable": asset_data.get("shortable", False),
                        "easy_to_borrow": asset_data.get("easy_to_borrow", False),
                        "fractionable": asset_data.get("fractionable", False),
                        "maintenance_margin_requirement": asset_data.get(
                            "maintenance_margin_requirement"
                        ),
                        "margin_requirement_long": asset_data.get(
                            "margin_requirement_long"
                        ),
                        "margin_requirement_short": asset_data.get(
                            "margin_requirement_short"
                        ),
                    }

                    if alpaca_id in existing_alpaca_ids:
                        assets_to_update.append(asset_dict)
                    else:
                        assets_to_create.append(Asset(**asset_dict))

                # Bulk create new assets
                if assets_to_create:
                    try:
                        created_assets = Asset.objects.bulk_create(
                            assets_to_create,
                            batch_size=batch_size,
                            ignore_conflicts=True,
                        )
                        created_count = len(created_assets)
                        total_created += created_count
                        logger.info(
                            f"Bulk created {created_count} new assets for {asset_class}"
                        )
                    except Exception as e:
                        logger.error(
                            f"Error bulk creating assets for {asset_class}: {e}"
                        )
                        total_errors += len(assets_to_create)

                # Bulk update existing assets
                if assets_to_update:
                    try:
                        # For updates, we need to fetch existing objects and update them
                        alpaca_ids_to_update = [
                            asset["alpaca_id"] for asset in assets_to_update
                        ]
                        existing_assets = {
                            asset.alpaca_id: asset
                            for asset in Asset.objects.filter(
                                alpaca_id__in=alpaca_ids_to_update,
                                asset_class=asset_class,
                            )
                        }

                        assets_to_bulk_update = []
                        for asset_data in assets_to_update:
                            alpaca_id = asset_data["alpaca_id"]
                            if alpaca_id in existing_assets:
                                existing_asset = existing_assets[alpaca_id]

                                # Update fields
                                for field, value in asset_data.items():
                                    if field != "alpaca_id":  # Don't update the ID
                                        setattr(existing_asset, field, value)

                                assets_to_bulk_update.append(existing_asset)

                        if assets_to_bulk_update:
                            Asset.objects.bulk_update(
                                assets_to_bulk_update,
                                [
                                    "symbol",
                                    "name",
                                    "asset_class",
                                    "exchange",
                                    "status",
                                    "tradable",
                                    "marginable",
                                    "shortable",
                                    "easy_to_borrow",
                                    "fractionable",
                                    "maintenance_margin_requirement",
                                    "margin_requirement_long",
                                    "margin_requirement_short",
                                ],
                                batch_size=batch_size,
                            )
                            updated_count = len(assets_to_bulk_update)
                            total_updated += updated_count
                            logger.info(
                                f"Bulk updated {updated_count} existing assets for {asset_class}"
                            )

                    except Exception as e:
                        logger.error(
                            f"Error bulk updating assets for {asset_class}: {e}"
                        )
                        total_errors += len(assets_to_update)

                logger.info(
                    f"Completed sync for {asset_class}: {len(assets_to_create)} created, {len(assets_to_update)} updated"
                )

            except Exception as e:
                logger.error(
                    f"Error syncing asset class {asset_class}: {e}", exc_info=True
                )
                total_errors += 1
                continue

        result = {
            "success": True,
            "total_created": total_created,
            "total_updated": total_updated,
            "total_errors": total_errors,
            "asset_classes_processed": asset_classes,
        }

        # Update sync status on successful sync
        sync_status.last_sync_at = timezone.now()
        sync_status.total_items = Asset.objects.filter(status="active").count()
        sync_status.is_syncing = False
        sync_status.save()

        logger.info(f"Asset sync completed: {result}")
        return result

    except Exception as e:
        error_msg = f"Critical error in alpaca_sync_task: {e}"
        logger.error(error_msg, exc_info=True)

        # Mark sync as not running on error
        try:
            sync_status.is_syncing = False
            sync_status.save()
        except Exception:
            pass  # Ignore errors when updating sync status

        return {"success": False, "error": error_msg}


@shared_task(name="fetch_historical_data", base=SingleInstanceTask)
def fetch_historical_data(asset_id: int):
    """
    Backfill strategy using optimized candle storage:
    1) Fetch only 1-minute bars from Alpaca and persist to MinuteCandle table.
    2) For each higher timeframe (5T, 15T, 30T, 1H, 4H, 1D), use CandleRepository
       to aggregate from minute candles using efficient SQL.
    """
    asset = Asset.objects.filter(id=asset_id).first()
    if not asset:
        logger.error(f"Asset with ID {asset_id} does not exist.")
        return

    symbol = asset.symbol

    running_key = cache_keys.backfill(asset.id).running()
    if not cache.add(running_key, 1, timeout=LOCK_TTL):
        logger.info(
            "Backfill already running for asset_id=%s symbol=%s — skipping.",
            asset.id,
            symbol,
        )
        return

    repo = CandleRepository()

    try:
        service = alpaca_service
        end_date = timezone.now()

        # Step 1: Fetch 1T bars and persist to MinuteCandle
        try:
            # Check last minute candle in new table
            last_1t = (
                MinuteCandle.objects.filter(asset_id=asset.id)
                .order_by("-timestamp")
                .first()
            )
            start_date_1t = (
                last_1t.timestamp + timedelta(minutes=1)
                if last_1t
                else end_date - timedelta(days=settings.HISTORIC_DATA_LOADING_LIMIT)
            )

            if start_date_1t < end_date:
                # Chunk by 10 days, walking backwards (newest first)
                current_end, created_total = end_date, 0
                while current_end > start_date_1t:
                    r_start = max(start_date_1t, current_end - timedelta(days=10))
                    start_str = r_start.strftime("%Y-%m-%dT%H:%M:%SZ")
                    end_str = current_end.strftime("%Y-%m-%dT%H:%M:%SZ")
                    try:
                        resp = service.get_historic_bars(
                            symbol=symbol,
                            start=start_str,
                            end=end_str,
                            sort="desc",  # fetch latest first
                            asset_class=asset.asset_class,
                        )
                    except Exception as e:
                        logger.error(
                            f"API error for {symbol} 1T {r_start}->{current_end}: {e}",
                            exc_info=True,
                        )
                        current_end = r_start
                        continue

                    # Treat missing or null bars as no data
                    bars = (resp or {}).get("bars") or []
                    candles = []
                    for bar in bars:
                        ts = datetime.fromisoformat(bar["t"].replace("Z", "+00:00"))
                        if not _is_market_hours(ts):
                            continue
                        candles.append(
                            {
                                "asset_id": asset.id,
                                "timestamp": ts,
                                "open": float(bar["o"]),
                                "high": float(bar["h"]),
                                "low": float(bar["l"]),
                                "close": float(bar["c"]),
                                "volume": int(bar.get("v", 0)),
                                "trade_count": bar.get("n"),
                                "vwap": bar.get("vw"),
                            }
                        )

                    if candles:
                        # Use repository for efficient bulk insert
                        repo.bulk_insert_minute_candles(candles, ignore_conflicts=True)
                        created_total += len(candles)
                    current_end = r_start

                logger.info(
                    "Backfilled %d minute candles for %s (newest first)",
                    created_total,
                    symbol,
                )
        except Exception as e:
            logger.error("Error backfilling 1T for %s: %s", symbol, e, exc_info=True)

        # Step 2: Aggregate from MinuteCandle to higher TFs using repository
        for tf, delta in const.TF_LIST:
            if tf == const.TF_1T:
                continue
            try:
                # Check last aggregated candle in new table
                last_tf = (
                    AggregatedCandle.objects.filter(asset_id=asset.id, timeframe=tf)
                    .order_by("-timestamp")
                    .first()
                )

                # Determine start bucket to (re)build
                start_ts = (
                    last_tf.timestamp + delta
                    if last_tf
                    else end_date - timedelta(days=settings.HISTORIC_DATA_LOADING_LIMIT)
                )

                # Use repository's SQL-based aggregation
                affected = repo.aggregate_to_timeframe(
                    asset_id=asset.id,
                    timeframe=tf,
                    start=start_ts,
                    end=end_date,
                )

                if affected > 0:
                    logger.info(
                        "Built %d %s candles for %s from minute data",
                        affected,
                        tf,
                        symbol,
                    )
            except Exception as e:
                logger.error(
                    "Error resampling %s for %s: %s", tf, symbol, e, exc_info=True
                )

        # Mark backfill as complete
        completion_key = cache_keys.backfill(asset.id).completed()
        cache.set(completion_key, 1, timeout=86400 * 1)  # Keep for 1 day
        logger.info(f"Marked backfill complete for asset_id={asset.id} symbol={symbol}")

    finally:
        # Always release the lock and clear any queued marker
        queued_key = cache_keys.backfill(asset.id).queued()
        cache.delete(running_key)
        cache.delete(queued_key)


@shared_task(name="check_watchlist_candles")
def check_watchlist_candles():
    """
    Periodic task to check watchlist assets for missing 1T candles in the last month.
    If missing candles are found, fetch them from Alpaca and resample higher timeframes.
    Only runs during North American market hours (9:30 AM - 4:00 PM ET, weekdays).
    """
    from django.utils import timezone

    now = timezone.now()

    # Check if it's market hours
    if not _is_market_hours(now):
        logger.info("Not market hours, skipping watchlist candle check")
        return

    logger.info("Starting watchlist candle check task")

    # Get all active watchlist assets
    watchlist_assets = (
        WatchListAsset.objects.filter(is_active=True, watchlist__is_active=True)
        .select_related("asset", "watchlist")
        .distinct("asset")
    )

    end_date = timezone.now()
    start_date = end_date - timedelta(days=30)  # Last 1 month

    total_missing_found = 0
    assets_processed = 0

    for wla in watchlist_assets:
        asset = wla.asset
        symbol = asset.symbol

        try:
            # Skip if backfill is currently running for this asset
            running_key = cache_keys.backfill(asset.id).running()
            try:
                if cache.get(running_key):
                    logger.info(f"Backfill running for {symbol}, skipping candle check")
                    continue
            except Exception as e:
                logger.warning(f"Failed to check backfill status for {symbol}: {e}")
                # Continue anyway if we can't check

            # Check for missing 1T candles in the last month
            # We'll look for gaps in the timestamp sequence during market hours
            missing_periods = _find_missing_candle_periods(asset, start_date, end_date)

            if not missing_periods:
                logger.debug(f"No missing candles for {symbol}")
                continue

            logger.info(f"Found {len(missing_periods)} missing periods for {symbol}")

            # Fetch missing data from Alpaca
            fetched_count = _fetch_missing_candles(asset, missing_periods)
            total_missing_found += fetched_count

            # Resample higher timeframes for the affected periods
            if fetched_count > 0:
                _resample_higher_timeframes(asset, start_date, end_date)

        except Exception as e:
            logger.error(f"Error processing {symbol}: {e}", exc_info=True)
            continue

        assets_processed += 1

    logger.info(
        f"Watchlist candle check completed. Processed {assets_processed} assets, fetched {total_missing_found} missing candles"
    )


def _find_missing_candle_periods(asset, start_date, end_date):
    """
    Find periods where 1T candles are missing during market hours.
    Returns list of (start, end) tuples for missing periods.
    """

    missing_periods = []

    # Get all existing 1T candles in the period, ordered by timestamp

    existing_candles = list(
        Candle.objects.filter(
            asset=asset,
            timeframe=const.TF_1T,
            timestamp__gte=start_date,
            timestamp__lt=end_date,
        )
        .order_by("timestamp")
        .values_list("timestamp", flat=True)
    )

    if not existing_candles:
        # No candles at all, return the entire period
        return [(start_date, end_date)]

    # Check for gaps between consecutive candles
    prev_ts = None
    for ts in existing_candles:
        if prev_ts and _is_market_hours(prev_ts):
            # Calculate expected next timestamp (1 minute later)
            expected_next = prev_ts + timedelta(minutes=1)

            # If there's a gap and we're still in market hours, it's missing
            if expected_next < ts and _is_market_hours(expected_next):
                missing_periods.append((expected_next, ts))

        prev_ts = ts

    # Check if we need data before the first candle
    first_candle = existing_candles[0]
    if start_date < first_candle and _is_market_hours(start_date):
        missing_periods.append((start_date, first_candle))

    # Check if we need data after the last candle
    last_candle = existing_candles[-1]
    if last_candle < end_date and _is_market_hours(last_candle + timedelta(minutes=1)):
        missing_periods.append((last_candle + timedelta(minutes=1), end_date))

    return missing_periods


def _fetch_missing_candles(asset, missing_periods):
    """
    Fetch missing 1T candles from Alpaca for the given periods.
    Returns the number of candles fetched.
    """
    service = alpaca_service
    symbol = asset.symbol
    total_fetched = 0

    for start_period, end_period in missing_periods:
        try:
            # Fetch in chunks to avoid API limits
            current_end = end_period
            chunk_days = 7  # Fetch 1 week at a time

            while current_end > start_period:
                chunk_start = max(
                    start_period, current_end - timedelta(days=chunk_days)
                )

                start_str = chunk_start.strftime("%Y-%m-%dT%H:%M:%SZ")
                end_str = current_end.strftime("%Y-%m-%dT%H:%M:%SZ")

                try:
                    resp = service.get_historic_bars(
                        symbol=symbol,
                        start=start_str,
                        end=end_str,
                        sort="desc",
                        timeframe=const.TF_1T,
                        asset_class=asset.asset_class,
                    )
                except Exception as e:
                    logger.error(
                        f"API error fetching {symbol} {chunk_start}->{current_end}: {e}"
                    )
                    current_end = chunk_start
                    continue

                bars = (resp or {}).get("bars") or []
                candles = []

                for bar in bars:
                    ts = datetime.fromisoformat(bar["t"].replace("Z", "+00:00"))
                    if not _is_market_hours(ts):
                        continue

                    candles.append(
                        Candle(
                            asset=asset,
                            timestamp=ts,
                            open=float(bar["o"]),
                            high=float(bar["h"]),
                            low=float(bar["l"]),
                            close=float(bar["c"]),
                            volume=float(bar.get("v", 0)),
                            trade_count=bar.get("n"),
                            vwap=bar.get("vw"),
                            timeframe=const.TF_1T,
                        )
                    )

                if candles:
                    Candle.objects.bulk_create(candles, ignore_conflicts=True)
                    total_fetched += len(candles)
                    logger.debug(
                        f"Fetched {len(candles)} candles for {symbol} in {chunk_start}->{current_end}"
                    )

                current_end = chunk_start

        except Exception as e:
            logger.error(
                f"Error fetching missing candles for {symbol}: {e}", exc_info=True
            )
            continue

    return total_fetched


def _resample_higher_timeframes(asset, start_date, end_date):
    """
    Resample higher timeframes from 1T candles for the given period.
    Uses similar logic to fetch_historical_data task.
    Only resamples if backfill is complete (following websocket service logic).
    """
    from django.db import connection

    # Check if backfill is complete before resampling higher TFs
    # This follows the same logic as websocket_service._is_historical_backfill_complete
    if not _is_backfill_complete_for_asset(asset):
        logger.info(
            f"Skipping higher TF resampling for {asset.symbol} - backfill not complete"
        )
        return

    for tf, delta in const.TF_LIST:
        if tf == const.TF_1T:
            continue

        try:
            # Build buckets using SQL for efficiency
            anchor = "1970-01-01 09:30:00-05:00"

            with connection.cursor() as cur:
                cur.execute(
                    """
                    WITH m1 AS (
                        SELECT id, timestamp, open, high, low, close, volume
                        FROM core_candle
                        WHERE asset_id = %s AND timeframe = %s AND timestamp >= %s AND timestamp < %s
                    ),
                    binned AS (
                        SELECT
                            date_bin(INTERVAL %s, timestamp, TIMESTAMP %s) AS bucket,
                            id,
                            open, high, low, close, volume,
                            row_number() OVER (PARTITION BY date_bin(INTERVAL %s, timestamp, TIMESTAMP %s) ORDER BY timestamp ASC) AS rn_open,
                            row_number() OVER (PARTITION BY date_bin(INTERVAL %s, timestamp, TIMESTAMP %s) ORDER BY timestamp DESC) AS rn_close
                        FROM m1
                    ),
                    agg AS (
                        SELECT
                            bucket,
                            MIN(low) AS l,
                            MAX(high) AS h,
                            SUM(volume) AS v,
                            ARRAY_AGG(id ORDER BY id) AS ids,
                            MIN(CASE WHEN rn_open=1 THEN open END) AS o,
                            MIN(CASE WHEN rn_close=1 THEN close END) AS c
                        FROM binned
                        GROUP BY bucket
                    )
                    SELECT bucket, o, h, l, c, v, ids
                    FROM agg
                    ORDER BY bucket DESC
                    ;
                    """,
                    [
                        asset.id,
                        const.TF_1T,
                        start_date,
                        end_date,
                        delta,
                        anchor,
                        delta,
                        anchor,
                        delta,
                        anchor,
                    ],
                )
                rows = cur.fetchall()

            if not rows:
                continue

            # Upsert aggregated candles
            buckets = [row[0] for row in rows]
            existing = {
                c.timestamp: c
                for c in Candle.objects.filter(
                    asset=asset, timeframe=tf, timestamp__in=buckets
                )
            }

            to_create = []
            to_update = []
            for bucket, o, h, low_, c, v, ids in rows:
                if bucket in existing:
                    cobj = existing[bucket]
                    cobj.open = float(o)
                    cobj.high = float(h)
                    cobj.low = float(low_)
                    cobj.close = float(c)
                    cobj.volume = int(v or 0)
                    cobj.minute_candle_ids = list(ids) if ids else []
                    to_update.append(cobj)
                else:
                    to_create.append(
                        Candle(
                            asset=asset,
                            timeframe=tf,
                            timestamp=bucket,
                            open=float(o),
                            high=float(h),
                            low=float(low_),
                            close=float(c),
                            volume=int(v or 0),
                            minute_candle_ids=list(ids) if ids else [],
                        )
                    )

            if to_create:
                Candle.objects.bulk_create(to_create, ignore_conflicts=True)
            if to_update:
                Candle.objects.bulk_update(
                    to_update,
                    [
                        "open",
                        "high",
                        "low",
                        "close",
                        "volume",
                        "minute_candle_ids",
                    ],
                )
            logger.info(
                f"Resampled {len(to_create)} new and updated {len(to_update)} {tf} candles for {asset.symbol}"
            )

        except Exception as e:
            logger.error(
                f"Error resampling {tf} for {asset.symbol}: {e}", exc_info=True
            )


def _is_backfill_complete_for_asset(asset):
    """
    Check if historical backfill is complete for this asset.
    Mirrors websocket_service._is_historical_backfill_complete logic.
    """
    # Check if backfill is currently running
    running_key = cache_keys.backfill(asset.id).running()
    try:
        if cache.get(running_key):
            return False
    except Exception as e:
        logger.warning(f"Failed to check cache for running backfill {running_key}: {e}")
        # Assume not running if we can't check
        pass

    # Check if backfill has been explicitly marked as complete
    completion_key = cache_keys.backfill(asset.id).completed()
    try:
        if cache.get(completion_key):
            return True
    except Exception as e:
        logger.warning(
            f"Failed to check cache for backfill completion {completion_key}: {e}"
        )
        # Assume not complete if we can't check
        pass

    # For assets without explicit completion flag, use heuristics
    # Check if we have sufficient historical 1T data coverage (at least 2 days of 1T data)
    now_dt = timezone.now()
    coverage_threshold = now_dt - timedelta(days=4)

    earliest_1t = (
        Candle.objects.filter(asset=asset, timeframe=const.TF_1T)
        .order_by("timestamp")
        .first()
    )

    if not earliest_1t or earliest_1t.timestamp > coverage_threshold:
        # Not enough historical coverage, let backfill handle higher TFs
        return False

    # Check if higher TF already has historical data (not just today's data)
    historical_threshold = now_dt.replace(
        hour=0, minute=0, second=0, microsecond=0
    ) - timedelta(days=1)
    existing_historical_higher_tf = Candle.objects.filter(
        asset=asset,
        timeframe__in=[tf for tf in const.TF_CFG.keys() if tf != const.TF_1T],
        timestamp__lt=historical_threshold,
    ).exists()

    return existing_historical_higher_tf


def _is_market_hours(dt: datetime) -> bool:
    eastern = pytz.timezone("US/Eastern")
    if dt.tzinfo is None:
        dt = timezone.make_aware(dt, pytz.UTC)
    et = dt.astimezone(eastern)
    if et.weekday() > 4:
        return False
    return time(9, 30) <= et.time() < time(16, 0)
