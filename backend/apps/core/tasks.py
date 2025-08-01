from datetime import datetime, time, timedelta
import json
import time as PythonTime

from celery import Task, shared_task
from celery.utils.log import get_task_logger
from django.core.cache import cache
from pytz import timezone

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
def alpaca_sync_task(alpaca_account_id: int):
    account = AlpacaAccount.objects.filter(id=alpaca_account_id).first()
    service = AlpacaService(
        api_key=account.api_key,
        secret_key=account.api_secret,
    )

    # Fetch assets from Alpaca
    assets_data = service.list_assets(
        status="active",
        asset_class="us_equity",
        fallback_symbols=["AAPL", "GOOGL", "MSFT", "TSLA", "NVDA"],
    )

    created_count = 0
    updated_count = 0

    for asset_data in assets_data:
        asset, created = Asset.objects.update_or_create(
            alpaca_id=asset_data.get("id", asset_data["symbol"]),
            defaults={
                "symbol": asset_data["symbol"],
                "name": asset_data.get("name", ""),
                "asset_class": asset_data.get("class", "us_equity"),
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
                "margin_requirement_long": asset_data.get("margin_requirement_long"),
                "margin_requirement_short": asset_data.get("margin_requirement_short"),
            },
        )
        if created:
            created_count += 1
        else:
            updated_count += 1


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
    existing_candles = Candle.objects.filter(
        asset=watchlist_asset.asset
    ).order_by("timestamp")
    
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
            
            for bar in batch_data:
                # Parse datetime from Alpaca format
                timestamp = datetime.fromisoformat(bar["t"].replace("Z", "+00:00"))
                
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
                    f"Created {len(candles_to_create)} candles for asset {asset.symbol}. "
                    f"DB time: {db_time.total_seconds():.2f}s, Total time: {batch_time.total_seconds():.2f}s"
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
                    feed="iex"
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
                    exc_info=True
                )
                # Continue with next chunk despite errors
            
            completed_chunks += 1
            progress = (completed_chunks / total_chunks) * 100
            logger.info(f"Progress: {progress:.1f}% ({completed_chunks}/{total_chunks} chunks)")
        
        logger.info(f"Completed fetching historical data for asset {watchlist_asset.asset.symbol}.")
        
    except Exception as e:
        logger.error(
            f"Error fetching historical data for WatchListAsset {watchlist_asset_id}: {e}",
            exc_info=True,
        )
        return
