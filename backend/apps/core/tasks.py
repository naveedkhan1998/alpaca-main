from datetime import datetime, time, timedelta
import json
import time as PythonTime

from celery import Task, shared_task
from celery.utils.log import get_task_logger
from django.core.cache import cache
from pytz import timezone

from apps.account.models import User
from apps.core.breeze import breeze_session_manager
from apps.core.models import (
    Candle,
    SubscribedInstruments,
    Tick,
)
from apps.core.utils import fetch_historical_data
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


@shared_task(name="manual_start_websocket")
def manual_start_websocket(user_id: int) -> None:
    """
    Starts a websocket session for the given user ID.
    This task is intended to be called manually, for example, from a Django view.
    It will create a Celery task that manages the websocket session.
    """

    # Check if the user has a valid Breeze session
    session = breeze_session_manager.initialize_session(user_id)
    check_breeze_session = session.get_funds()
    if check_breeze_session.get("Status") == 200:
        logger.info("Starting websocket session for user %s", user_id)
        # Trigger the websocket task with deduplication
        result = websocket_start.apply_async(args=[user_id])
        if result is None:
            logger.info(
                f"WebSocket task for user {user_id} is already running. Skipping."
            )


@shared_task(bind=True, base=SingleInstanceTask, name="websocket_start")
def websocket_start(_self, user_id: int):
    """
    Initializes the WebSocket connection for the user and subscribes to feeds
    for instruments. Listens for new subscription requests and subscribes dynamically.
    Only one instance per user is allowed to run at a time.
    """

    try:
        # Retrieve the user
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            logger.warning(f"No user found with id {user_id}.")
            return

        # Initialize WebSocket session
        sess = breeze_session_manager.initialize_session(user_id)
        sess.ws_connect()

        # Subscribe to initial instruments
        # sub_ins = SubscribedInstruments.objects.all()
        load_candles.delay(user.pk)  # Asynchronously load candle data

        def on_ticks(ticks):
            tick_handler.delay(ticks)

        # if sub_ins.exists():
        #     for ins in sub_ins:
        #         if ins.percentage.is_loading:
        #             ins.percentage.percentage = 0
        #             ins.percentage.is_loading = False
        #             ins.percentage.save()
        #             sess.subscribe_feeds(stock_token=ins.stock_token)

        sess.on_ticks = on_ticks
        logger.info("WebSocket connection established and initial subscriptions set.")

        # Access Redis via Django's cache
        redis_client = utils.get_redis_client("default")
        subscription_queue = const.websocket_subscription_queue(user_id)
        unsubscription_queue = const.websocket_unsubscription_queue(user_id)

        count = 0
        while True:
            try:
                if count >= 10:
                    cache.set(
                        const.WEBSOCKET_HEARTBEAT_KEY,
                        True,
                        timeout=const.WEBSOCKET_HEARTBEAT_TTL,
                    )
                    count = 0
                count += 1
                # Attempt to pop a new subscription from the queue with a timeout
                subscription = redis_client.blpop(subscription_queue, timeout=5)
                if subscription:
                    _, data = subscription
                    subscription_data = json.loads(data)
                    stock_token = subscription_data.get("stock_token")

                    if stock_token:
                        # Subscribe to the new instrument
                        sess.subscribe_feeds(stock_token=stock_token)
                        logger.info(f"Subscribed to new instrument: {stock_token}")
                unsubscribetion = redis_client.blpop(unsubscription_queue, timeout=5)
                if unsubscribetion:
                    _, data = unsubscribetion
                    unsubscription_data = json.loads(data)
                    stock_token = unsubscription_data.get("stock_token")
                    if stock_token:
                        # Unsubscribe from the instrument
                        sess.unsubscribe_feeds(stock_token=stock_token)
                        logger.info(f"Unsubscribed from instrument: {stock_token}")

            except Exception as e:
                logger.error(f"Error while processing subscription: {e}", exc_info=True)

            # Implement a short sleep to prevent tight looping
            PythonTime.sleep(1)

    except Exception as e:
        logger.error(f"Error in websocket_start: {e}", exc_info=True)
    finally:
        # Clean up: Disconnect WebSocket and release the lock
        try:
            sess.ws_disconnect()
            logger.info("WebSocket connection closed.")
        except Exception as e:
            logger.error(f"Error while disconnecting WebSocket: {e}", exc_info=True)


@shared_task(name="tick_handler")
def tick_handler(ticks):
    """
    Processes incoming tick data by storing it in the database if within market hours.

    Args:
        ticks (dict): A dictionary containing tick data with keys 'ltt', 'symbol', and 'last'.
    """
    try:
        # Set the time zone to India
        india_tz = timezone("Asia/Kolkata")

        # Get the current time in India
        current_time_in_india = datetime.now(india_tz).time()

        # Define market hours
        market_start = time(9, 15)
        market_end = time(15, 30)

        # Check if it's within the market hours in India
        if market_start <= current_time_in_india <= market_end:
            date = datetime.strptime(ticks["ltt"], "%a %b %d %H:%M:%S %Y")
            sub_ins = SubscribedInstruments.objects.filter(
                stock_token=ticks["symbol"]
            ).first()
            if sub_ins:
                volume = 0
                if ticks["ltq"]:
                    volume = ticks["ltq"]
                Tick.objects.create(
                    instrument=sub_ins, ltp=ticks["last"], ltq=volume, date=date
                )
                logger.info(
                    f"Tick saved for instrument {sub_ins.stock_token} at {date}."
                )
            else:
                logger.warning(
                    f"No subscribed instrument found for symbol: {ticks['symbol']}"
                )
        else:
            logger.info("Tick received outside of market hours. Ignored.")
    except Exception as e:
        logger.error(f"Error in tick_handler: {e}", exc_info=True)


@shared_task(name="candle_maker")
def candle_maker():
    """
    Initiates the candle-making process for all subscribed instruments by delegating
    to the 'sub_candle_maker' task for each instrument.
    """
    try:
        sub_ins = SubscribedInstruments.objects.all()
        if sub_ins.exists():
            for ins in sub_ins:
                if ins.percentage.is_loading:
                    sub_candle_maker.delay(ins.id)
            logger.info(f"Initiated candle making for {sub_ins.count()} instruments.")
        else:
            logger.info("No subscribed instruments found for candle making.")
    except Exception as e:
        logger.error(f"Error in candle_maker: {e}", exc_info=True)


@shared_task(name="sub_candle_maker")
def sub_candle_maker(ins_id: int):
    """
    Processes ticks for a specific instrument to create or update the most recent candle.

    Args:
        ins_id (int): The ID of the subscribed instrument.
    """
    try:
        ticks = Tick.objects.filter(instrument_id=ins_id, used=False).order_by("date")
        if not ticks.exists():
            logger.info(f"No new ticks to process for instrument ID {ins_id}.")
            return

        for tick in ticks:
            # buy_volume = tick.get("totalBuyQt", 0)
            # sell_volume = tick.get("totalSellQ", 0)
            candle_time = tick.date.replace(second=0, microsecond=0)
            try:
                # Try to get a single candle
                candle, created = Candle.objects.get_or_create(
                    instrument_id=ins_id,
                    date=candle_time,
                    defaults={
                        "open": tick.ltp,
                        "high": tick.ltp,
                        "low": tick.ltp,
                        "close": tick.ltp,
                        "volume": tick.ltq,
                    },
                )
            except Candle.MultipleObjectsReturned:
                # If multiple candles exist for the same time, merge them
                candles = list(
                    Candle.objects.filter(instrument_id=ins_id, date=candle_time)
                )
                logger.warning(
                    f"Multiple candles found for instrument ID {ins_id} at {candle_time}. Merging."
                )

                # Create a new merged candle with the first candle's open and earliest date
                merged_candle = candles[0]

                # Find the lowest low, highest high, and sum volumes
                for c in candles[1:]:
                    merged_candle.low = min(merged_candle.low, c.low)
                    merged_candle.high = max(merged_candle.high, c.high)
                    merged_candle.volume += c.volume
                    # Keep the latest close
                    merged_candle.close = c.close

                # Save the merged candle and delete others
                merged_candle.save()
                Candle.objects.filter(instrument_id=ins_id, date=candle_time).exclude(
                    id=merged_candle.id
                ).delete()

                # Use the merged candle for further processing
                candle = merged_candle
                created = False

            if not created:
                updated = False
                if candle.low > tick.ltp:
                    candle.low = tick.ltp
                    updated = True
                if candle.high < tick.ltp:
                    candle.high = tick.ltp
                    updated = True
                if candle.low <= tick.ltp <= candle.high:
                    candle.close = tick.ltp
                    updated = True
                if updated:
                    candle.volume += tick.ltq
                    candle.save()
                    logger.info(
                        f"Candle updated for instrument ID {ins_id} at {candle_time}."
                    )
                else:
                    logger.debug(
                        f"No update required for candle at {candle_time} for instrument ID {ins_id}."
                    )

        # Delete ticks after use
        count = ticks.count()
        ticks.delete()
        logger.info(
            f"Processed and marked {count} ticks as used for instrument ID {ins_id}."
        )
    except Exception as e:
        logger.error(
            f"Error in sub_candle_maker for instrument ID {ins_id}: {e}", exc_info=True
        )


@shared_task(name="load_instrument_candles")
def load_instrument_candles(ins_id: int, user_id: int, duration: int = 4):
    """
    Loads historical candle data for a specific instrument within a given duration.

    Args:
        ins_id (int): The ID of the subscribed instrument.
        user_id (int): The ID of the user initiating the request.
        duration (int, optional): Number of weeks of historical data to fetch. Defaults to 4.
    """
    try:
        sess = breeze_session_manager.initialize_session(user_id)
        sub_ins = (
            SubscribedInstruments.objects.filter(id=ins_id)
            .select_related("percentage")
            .first()
        )

        if not sub_ins:
            logger.warning(f"Subscribed instrument with ID {ins_id} does not exist.")
            return

        qs = Candle.objects.filter(instrument=sub_ins).order_by("date")
        india_tz = timezone("Asia/Kolkata")

        # Define the end and start dates
        end = datetime.now(india_tz)
        start = end - timedelta(weeks=duration)

        if qs.exists():
            start = qs.last().date

        expiry = None
        if sub_ins.expiry:
            expiry = sub_ins.expiry

        # Define a callback function to process data batches as they arrive
        def process_candle_batch(batch_data):
            candles_to_create = []

            # Log batch processing start time
            batch_start = datetime.now()
            logger.info(
                f"Processing batch of {len(batch_data)} candles for instrument ID {ins_id}"
            )

            for item in batch_data:
                date = datetime.strptime(item["datetime"], "%Y-%m-%d %H:%M:%S")
                market_open_time = date.replace(
                    hour=9, minute=15, second=0, microsecond=0
                )
                market_close_time = date.replace(
                    hour=15, minute=30, second=0, microsecond=0
                )

                if (
                    date.time() < market_open_time.time()
                    or date.time() > market_close_time.time()
                ):
                    continue
                # now convert date to India timezone
                date = india_tz.localize(date)
                candle = Candle(
                    instrument=sub_ins,
                    date=date,
                    open=item["open"],
                    close=item["close"],
                    low=item["low"],
                    high=item["high"],
                    volume=item.get("volume", 0),
                )
                candles_to_create.append(candle)

            # Bulk create the batch of candles immediately
            if candles_to_create:
                db_start = datetime.now()
                Candle.objects.bulk_create(candles_to_create, ignore_conflicts=True)
                db_time = datetime.now() - db_start
                batch_time = datetime.now() - batch_start

                logger.info(
                    f"Created {len(candles_to_create)} candles for instrument ID {ins_id}. "
                    f"DB time: {db_time.total_seconds():.2f}s, Total time: {batch_time.total_seconds():.2f}s"
                )

        # Fetch and process historical data using the callback with reverse order
        logger.info(
            f"Starting historical data fetch for instrument ID {ins_id} from {start} to {end}"
        )
        fetch_historical_data(
            sess,
            start,
            end,
            sub_ins.short_name,
            expiry,
            sub_ins.stock_token,
            sub_ins,
            batch_callback=process_candle_batch,
            reverse_order=True,
        )

        # Update percentage loading status
        percentage = sub_ins.percentage
        percentage.percentage = 100
        percentage.is_loading = True
        percentage.save()

        # Enqueue the subscription request in Redis cache
        #
        redis_client = utils.get_redis_client("default")
        subscription = {"stock_token": sub_ins.stock_token}
        subscription_queue = const.websocket_subscription_queue(user_id)
        redis_client.rpush(subscription_queue, json.dumps(subscription))
        logger.info(
            f"Enqueued subscription for instrument ID {ins_id} with stock token {sub_ins.stock_token}."
        )
        logger.info(f"Completed loading candles for instrument ID {ins_id}.")

    except Exception as e:
        logger.error(
            f"Error in load_instrument_candles for instrument ID {ins_id}: {e}",
            exc_info=True,
        )


@shared_task(name="load_candles")
def load_candles(user_id: int):
    """
    Loads historical candle data for all subscribed instruments for a given user.

    Args:
        user_id (int): The ID of the user initiating the request.
    """
    try:
        sub_ins_queryset = SubscribedInstruments.objects.all()

        if not sub_ins_queryset.exists():
            logger.info("No subscribed instruments found to load candles.")
            return

        for ins in sub_ins_queryset:
            load_instrument_candles.delay(ins.id, user_id, duration=4)

        logger.info(
            f"Initiated loading candles for {sub_ins_queryset.count()} instruments."
        )
    except Exception as e:
        logger.error(f"Error in load_candles: {e}", exc_info=True)


@shared_task(name="resample_candles")
def resample_candles(candles: list, timeframe: int) -> list:
    """
    Resamples a list of candle data to a specified timeframe.

    Args:
        candles (list): A list of candle dictionaries containing 'date', 'open', 'high', 'low', 'close', and 'volume'.
        timeframe (int): The timeframe in minutes to resample the candles.

    Returns:
        list: A list of resampled candle dictionaries.
    """
    if not candles:
        logger.warning("No candles provided for resampling.")
        return []

    try:
        resampled_candles = []
        current_time = datetime.fromisoformat(candles[0]["date"])
        next_time = current_time + timedelta(minutes=timeframe)
        current_open = candles[0]["open"]
        current_high = float("-inf")
        current_low = float("inf")
        current_close = None
        current_volume = 0
        current_day = current_time.date()

        for candle in candles:
            candle_date = datetime.fromisoformat(candle["date"])
            candle_day = candle_date.date()

            # Check if the day has changed
            if candle_day != current_day:
                # Include the last incomplete candle of the previous day
                resampled_candles.append(
                    {
                        "open": current_open,
                        "high": current_high,
                        "low": current_low,
                        "close": current_close,
                        "volume": current_volume,
                        "date": current_time.isoformat(),
                    }
                )
                # Reset for the new day
                current_time = candle_date
                next_time = current_time + timedelta(minutes=timeframe)
                current_open = candle["open"]
                current_high = candle["high"]
                current_low = candle["low"]
                current_volume = candle["volume"]
                current_close = candle["close"]
                current_day = candle_day
                continue

            if candle_date >= next_time:
                resampled_candles.append(
                    {
                        "open": current_open,
                        "high": current_high,
                        "low": current_low,
                        "close": current_close,
                        "volume": current_volume,
                        "date": current_time.isoformat(),
                    }
                )
                current_time = next_time
                next_time = current_time + timedelta(minutes=timeframe)
                current_open = candle["open"]
                current_high = candle["high"]
                current_low = candle["low"]
                current_volume = candle["volume"]
            else:
                current_high = max(current_high, candle["high"])
                current_low = min(current_low, candle["low"])
                current_volume += candle["volume"]

            current_close = candle["close"]

        # Include the last incomplete candle
        resampled_candles.append(
            {
                "open": current_open,
                "high": current_high,
                "low": current_low,
                "close": current_close,
                "volume": current_volume,
                "date": current_time.isoformat(),
            }
        )

        logger.info(
            f"Resampled {len(resampled_candles)} candles to a {timeframe}-minute timeframe."
        )
        return resampled_candles

    except Exception as e:
        logger.error(f"Error in resample_candles: {e}", exc_info=True)
        return []
