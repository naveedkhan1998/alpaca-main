from datetime import datetime, time, timedelta

from celery import Task, shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import pytz

from apps.core.models import (
    AlpacaAccount,
    Asset,
    Candle,
    WatchListAsset,
)

from .services.alpaca_service import AlpacaService

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
def alpaca_sync_task(
    alpaca_account_id: int, asset_classes: list = None, batch_size: int = 1000
):
    """
    Optimized sync task that efficiently syncs assets from Alpaca API.

    Args:
        alpaca_account_id: ID of the Alpaca account to use for API calls
        asset_classes: List of asset classes to sync (defaults to all: ["us_equity", "us_option", "crypto"])
        batch_size: Number of assets to process in each batch
    """
    if asset_classes is None:
        asset_classes = ["us_equity", "us_option", "crypto"]

    try:
        account = AlpacaAccount.objects.filter(id=alpaca_account_id).first()
        if not account:
            logger.error(f"AlpacaAccount with ID {alpaca_account_id} not found")
            return {"error": f"Account {alpaca_account_id} not found"}

        service = AlpacaService(
            api_key=account.api_key,
            secret_key=account.api_secret,
        )

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

        logger.info(f"Asset sync completed: {result}")
        return result

    except Exception as e:
        error_msg = f"Critical error in alpaca_sync_task: {e}"
        logger.error(error_msg, exc_info=True)
        return {"success": False, "error": error_msg}


@shared_task(name="start_alpaca_stream", base=SingleInstanceTask)
def start_alpaca_stream(account_id: int, symbols: list):
    """
    Starts the Alpaca streaming for the given user and symbols.

    Args:
        account_id (int): The ID of the user initiating the request.
        symbols (list): The list of asset symbols to stream.
    """
    try:
        # Initialize the Alpaca WebSocket client
        account = AlpacaAccount.objects.get(id=account_id)
        client = AlpacaService(
            api_key=account.api_key,
            secret_key=account.api_secret,
        )
        logger.info(
            f"Started Alpaca streaming for user {account.id} with symbols: {symbols}"
        )
        client.stream(symbols)

    except Exception as e:
        logger.error(
            f"Error starting Alpaca stream for user {account.id}: {e}", exc_info=True
        )


@shared_task(name="fetch_historical_data", base=SingleInstanceTask)
def fetch_historical_data(watchlist_asset_id: int):
    """
    Backfill strategy:
    1) Fetch only 1-minute bars from Alpaca and persist as 1T.
    2) For each higher timeframe (5T, 15T, 30T, 1H, 4H, 1D), resample from stored 1T
       to compute OHLCV and persist, storing the list of minute candle IDs used.
    """
    watchlist_asset = (
        WatchListAsset.objects.filter(id=watchlist_asset_id)
        .select_related("asset", "watchlist__user")
        .first()
    )
    if not watchlist_asset:
        logger.error(f"WatchListAsset with ID {watchlist_asset_id} does not exist.")
        return

    asset = watchlist_asset.asset
    symbol = asset.symbol

    # Acquire per-asset distributed lock to avoid duplicate backfills
    RUNNING_TTL = 60 * 90  # 90 minutes; adjust as needed
    running_key = f"backfill:running:{asset.id}"
    if not cache.add(running_key, 1, timeout=RUNNING_TTL):
        logger.info(
            "Backfill already running for asset_id=%s symbol=%s — skipping.",
            asset.id,
            symbol,
        )
        return

    try:
        user_id = watchlist_asset.watchlist.user.id
        account = AlpacaAccount.objects.filter(user_id=user_id).first()
        if not account:
            logger.error(
                f"No Alpaca account found for user {user_id}. Cannot fetch historical data."
            )
            return

        service = AlpacaService(
            api_key=account.api_key,
            secret_key=account.api_secret,
        )

        # Define timeframes
        TF_LIST = [
            ("1T", timedelta(minutes=1)),
            ("5T", timedelta(minutes=5)),
            ("15T", timedelta(minutes=15)),
            ("30T", timedelta(minutes=30)),
            ("1H", timedelta(hours=1)),
            ("4H", timedelta(hours=4)),
            ("1D", timedelta(days=1)),
        ]

        end_date = timezone.now()

        # Step 1: Fetch 1T only
        try:
            last_1t = (
                Candle.objects.filter(asset=asset, timeframe="1T")
                .order_by("-timestamp")
                .first()
            )
            start_date_1t = (
                last_1t.timestamp + timedelta(minutes=1)
                if last_1t
                else end_date - timedelta(days=settings.HISTORIC_DATA_LOADING_LIMIT)
            )

            if start_date_1t < end_date:
                # chunk by 10 days, but create newest first by walking backwards
                current_end, created_total = end_date, 0
                while current_end > start_date_1t:
                    r_start = max(start_date_1t, current_end - timedelta(days=10))
                    start_str = r_start.strftime("%Y-%m-%dT%H:%M:%SZ")
                    end_str = current_end.strftime("%Y-%m-%dT%H:%M:%SZ")
                    try:
                        resp = service.get_historic_bars(
                            symbol=symbol,
                            timeframe="1Min",
                            start=start_str,
                            end=end_str,
                            limit=10000,
                            adjustment="raw",
                            feed="iex",
                            sort="desc",  # fetch latest first
                        )
                    except Exception as e:
                        logger.error(
                            f"API error for {symbol} 1T {r_start}->{current_end}: {e}",
                            exc_info=True,
                        )
                        current_end = r_start
                        continue

                    # Treat missing or null bars as no data (already up-to-date)
                    bars = (resp or {}).get("bars") or []
                    candles = []
                    for bar in bars:
                        ts = datetime.fromisoformat(bar["t"].replace("Z", "+00:00"))
                        # optional filter market hours only
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
                                volume=int(bar.get("v", 0)),
                                trade_count=bar.get("n"),
                                vwap=bar.get("vw"),
                                timeframe="1T",
                            )
                        )
                    if candles:
                        # Order of insertion follows API order (latest-first), which is desired
                        Candle.objects.bulk_create(candles, ignore_conflicts=True)
                        created_total += len(candles)
                    current_end = r_start
                logger.info(
                    "Backfilled %d 1T candles for %s (newest first)",
                    created_total,
                    symbol,
                )
        except Exception as e:
            logger.error("Error backfilling 1T for %s: %s", symbol, e, exc_info=True)

        # Step 2: Resample from 1T to higher TFs and persist with linkage
        for tf, delta in TF_LIST:
            if tf == "1T":
                continue
            try:
                last_tf = (
                    Candle.objects.filter(asset=asset, timeframe=tf)
                    .order_by("-timestamp")
                    .first()
                )
                # Determine start bucket to (re)build
                start_ts = (
                    last_tf.timestamp + delta
                    if last_tf
                    else (end_date - timedelta(days=1825))  # NOTE: 5 years
                )

                # Build buckets using SQL for efficiency; collect minute IDs
                # anchor for date_bin is market open ET to align intraday buckets
                anchor = "1970-01-01 09:30:00-05:00"
                from django.db import connection

                with connection.cursor() as cur:
                    cur.execute(
                        """
                        WITH m1 AS (
                            SELECT id, timestamp, open, high, low, close, volume
                            FROM core_candle
                            WHERE asset_id = %s AND timeframe = '1T' AND timestamp >= %s AND timestamp < %s
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
                            start_ts,
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

                # Upsert aggregated candles (create new + update existing)
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
                    "Built %d %s candles for %s from 1T (newest first); updated %d",
                    len(to_create),
                    tf,
                    symbol,
                    len(to_update),
                )
            except Exception as e:
                logger.error(
                    "Error resampling %s for %s: %s", tf, symbol, e, exc_info=True
                )
    finally:
        # Always release the lock and clear any queued marker for this asset
        cache.delete(running_key)
        cache.delete(f"backfill:queued:{asset.id}")


def _is_market_hours(dt: datetime) -> bool:
    eastern = pytz.timezone("US/Eastern")
    if dt.tzinfo is None:
        dt = timezone.make_aware(dt, pytz.UTC)
    et = dt.astimezone(eastern)
    if et.weekday() > 4:
        return False
    return time(9, 30) <= et.time() < time(16, 0)
