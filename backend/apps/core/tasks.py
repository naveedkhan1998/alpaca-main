from datetime import datetime, time, timedelta
import json
import time as PythonTime

from celery import Task, shared_task
from celery.utils.log import get_task_logger
from django.core.cache import cache
from django.utils import timezone
import pytz

from apps.account.models import User
from .services.alpaca_service import AlpacaService
from apps.core.models import (
    Candle,
    AlpacaAccount,
    Asset,
    WatchList,
    WatchListAsset,
    Tick,
)
from main import const, utils

logger = get_task_logger(__name__)


LOCK_TTL = 300  # 5 minutes
LOCK_WAIT = 5  # seconds to wait for lock
RETRY_MAX = None  # unlimited
RETRY_BACKOFF = True
RETRY_BACKOFF_MAX = 300  # cap 5 min


class SingleInstanceTask(Task):
    """Custom task class that prevents multiple instances of the same task"""

    def apply_async(self, args=None, kwargs=None, task_id=None, **options):
        # Generate a unique task_id based on the task name and user_id
        if args and len(args) > 0:
            user_id = args[0]
            task_id = f"{self.name}-user-{user_id}"

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


@shared_task(name="fetch_historical_data")
def fetch_historical_data(watchlist_asset_id: int):
    """
    Fetches 1 year of historical data for the asset in the watchlist using 2-day batches.
    Creates Candle objects for the fetched data.
    """
    watchlist_asset = WatchListAsset.objects.filter(id=watchlist_asset_id).first()
    if not watchlist_asset:
        logger.error(f"WatchListAsset with ID {watchlist_asset_id} does not exist.")
        return

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

    # Define date range - 1 year of data
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)

    # Check if we already have data and adjust start date
    existing_candles = Candle.objects.filter(asset=watchlist_asset.asset).order_by(
        "timestamp"
    )

    if existing_candles.exists():
        start_date = existing_candles.last().timestamp

    try:
        # Fetch data in 2-day chunks similar to load_instrument_candles
        chunk_size = timedelta(days=2)
        date_ranges = []
        current_date = start_date

        while current_date < end_date:
            range_end = min(current_date + chunk_size, end_date)
            date_ranges.append((current_date, range_end))
            current_date = range_end

        # Process in reverse order (newest first)
        date_ranges.reverse()

        total_chunks = len(date_ranges)
        completed_chunks = 0

        def process_candle_batch(batch_data, asset):
            """Process a batch of candle data and create Candle objects"""
            candles_to_create = []

            batch_start = datetime.now()
            logger.info(
                f"Processing batch of {len(batch_data)} candles for asset {asset.symbol}"
            )

            def is_market_hours(dt):
                """Check if the given datetime is within US market hours (9:30 AM - 4:00 PM ET, Monday-Friday)"""
                # Convert to US Eastern timezone
                eastern = pytz.timezone("US/Eastern")
                if dt.tzinfo is None:
                    dt = timezone.make_aware(dt, timezone=pytz.UTC)

                eastern_time = dt.astimezone(eastern)

                # Check if it's a weekday (Monday=0, Sunday=6)
                if eastern_time.weekday() > 4:  # Saturday or Sunday
                    return False

                # Check if it's within market hours (9:30 AM - 4:00 PM ET)
                market_open = time(9, 30)  # 9:30 AM
                market_close = time(16, 0)  # 4:00 PM

                current_time = eastern_time.time()
                return market_open <= current_time < market_close

            for bar in batch_data:
                # Parse datetime from Alpaca format
                timestamp = datetime.fromisoformat(bar["t"].replace("Z", "+00:00"))

                # Skip candles outside market hours
                if not is_market_hours(timestamp):
                    continue

                candle = Candle(
                    asset=asset,
                    timestamp=timestamp,
                    open=float(bar["o"]),
                    close=float(bar["c"]),
                    low=float(bar["l"]),
                    high=float(bar["h"]),
                    volume=int(bar.get("v", 0)),
                    trade_count=bar.get("n"),
                    vwap=bar.get("vw"),
                    timeframe="1Min",
                )
                candles_to_create.append(candle)

            # Bulk create the batch of candles
            if candles_to_create:
                db_start = datetime.now()
                Candle.objects.bulk_create(candles_to_create, ignore_conflicts=True)
                db_time = datetime.now() - db_start
                batch_time = datetime.now() - batch_start

                logger.info(
                    f"Created {len(candles_to_create)} market-hours candles for asset {asset.symbol} "
                    f"(filtered from {len(batch_data)} total bars). "
                    f"DB time: {db_time.total_seconds():.2f}s, Total time: {batch_time.total_seconds():.2f}s"
                )
            else:
                logger.info(
                    f"No market-hours candles to create for asset {asset.symbol} "
                    f"(filtered from {len(batch_data)} total bars)"
                )

        logger.info(
            f"Starting historical data fetch for asset {watchlist_asset.asset.symbol} from {start_date} to {end_date}"
        )

        for current_start, current_end in date_ranges:
            fetch_start_time = datetime.now()

            try:
                # Format dates for Alpaca API (ISO format)
                start_str = current_start.strftime("%Y-%m-%dT%H:%M:%SZ")
                end_str = current_end.strftime("%Y-%m-%dT%H:%M:%SZ")

                logger.info(
                    f"Requesting data for {watchlist_asset.asset.symbol} from {current_start} to {current_end}..."
                )

                # Fetch historical data from Alpaca
                response = service.get_historic_bars(
                    symbol=watchlist_asset.asset.symbol,
                    timeframe="1Min",
                    start=start_str,
                    end=end_str,
                    limit=10000,  # Maximum allowed
                    adjustment="raw",
                    feed="iex",
                )

                api_time = datetime.now() - fetch_start_time
                logger.info(
                    f"API request completed in {api_time.total_seconds():.2f} seconds"
                )

                bars_data = response.get("bars", [])

                if bars_data:
                    process_start_time = datetime.now()
                    process_candle_batch(bars_data, watchlist_asset.asset)
                    process_time = datetime.now() - process_start_time

                    logger.info(
                        f"Batch processing completed in {process_time.total_seconds():.2f} seconds"
                    )
                    logger.info(
                        f"Fetched {len(bars_data)} data points for asset {watchlist_asset.asset.symbol} from {current_start} to {current_end}."
                    )
                else:
                    logger.info(
                        f"No data returned for period {current_start} to {current_end}"
                    )

            except Exception as inner_e:
                logger.error(
                    f"Error fetching chunk {current_start} to {current_end}: {inner_e}",
                    exc_info=True,
                )
                # Continue with next chunk despite errors

            completed_chunks += 1
            progress = (completed_chunks / total_chunks) * 100
            logger.info(
                f"Progress: {progress:.1f}% ({completed_chunks}/{total_chunks} chunks)"
            )

        logger.info(
            f"Completed fetching historical data for asset {watchlist_asset.asset.symbol}."
        )

    except Exception as e:
        logger.error(
            f"Error fetching historical data for WatchListAsset {watchlist_asset_id}: {e}",
            exc_info=True,
        )
        return
