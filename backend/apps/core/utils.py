from datetime import datetime, timedelta

from django.db import models
from django.db.models import (
    F,
    Func,
    Max,
    Min,
    Sum,
    Value,
    Window,
)
from django.db.models.functions import Coalesce, FirstValue, RowNumber

from apps.core.breeze import BreezeConnect
from apps.core.helper import date_parser
from apps.core.models import Candle, SubscribedInstruments


def fetch_historical_data(
    breeze_session: BreezeConnect,
    start: datetime,
    end: datetime,
    short_name: str,
    expiry: datetime,
    stock_token: str,
    instrument: SubscribedInstruments,
    batch_callback=None,
    reverse_order=True,
) -> list:
    """
    Fetches historical data from the Breeze API for the given instrument within the specified date range.

    Args:
        breeze_session (BreezeConnect): The Breeze session for API communication.
        start (datetime): The start datetime for fetching data.
        end (datetime): The end datetime for fetching data.
        short_name (str): The short name of the instrument.
        expiry (datetime): The expiry datetime if applicable.
        stock_token (str): The stock token identifier.
        instrument (SubscribedInstruments): The subscribed instrument instance.
        batch_callback (function, optional): Callback function to process data batches as they are fetched.
        reverse_order (bool, optional): Whether to fetch data in reverse chronological order (newest first).

    Returns:
        list: A list of historical data dictionaries if no callback is provided.
    """
    data = []
    chunk_size = timedelta(days=2)  # Fetch data in 2-day chunks
    diff: timedelta = end - start
    total_days = diff.days + 1
    _ = max((total_days + 1) // 2, 1)  # Calculate number of chunks

    # Create a list of date ranges to process
    date_ranges = []
    current_date = start
    while current_date < end:
        range_end = min(current_date + chunk_size, end)
        date_ranges.append((current_date, range_end))
        current_date = range_end

    # Reverse the date ranges if needed (process newest data first)
    if reverse_order:
        date_ranges.reverse()

    try:
        # Initialize the progress
        instrument.percentage.percentage = 5
        instrument.percentage.save()

        total_chunks = len(date_ranges)
        completed_chunks = 0

        for current_start, current_end in date_ranges:
            fetch_start_time = datetime.now()

            # Prepare API parameters
            if instrument.series.upper() == "OPTION":
                market = "NFO"
                product_type = "options"
                option_type = (
                    "call" if instrument.option_type.upper() == "CE" else "put"
                )
                strike_price = str(instrument.strike_price)
                expiry_date = date_parser(expiry) if expiry else None
            else:
                market = "NSE" if stock_token.startswith("4") else "BSE"
                product_type = "futures"
                option_type = None
                strike_price = None
                expiry_date = None

            # Add a timeout to the API call
            try:
                # Log the API request
                print(
                    f"Requesting data for {short_name} from {current_start} to {current_end}..."
                )

                current_data = breeze_session.get_historical_data_v2(
                    interval="1minute",
                    from_date=date_parser(current_start),
                    to_date=date_parser(current_end),
                    stock_code=short_name,
                    exchange_code=market,
                    product_type=(
                        product_type
                        if instrument.series.upper() != "OPTION"
                        else "options"
                    ),
                    expiry_date=expiry_date,
                    right=option_type,
                    strike_price=strike_price if strike_price else None,
                )

                # Calculate and log the API response time
                api_time = datetime.now() - fetch_start_time
                print(
                    f"API request completed in {api_time.total_seconds():.2f} seconds"
                )

                fetched_data = current_data.get("Success", [])

                if fetched_data:
                    # If a callback is provided, process the batch immediately
                    if batch_callback and callable(batch_callback):
                        process_start_time = datetime.now()
                        batch_callback(fetched_data)
                        process_time = datetime.now() - process_start_time
                        print(
                            f"Batch processing completed in {process_time.total_seconds():.2f} seconds"
                        )
                    # Otherwise collect data for the traditional return method
                    else:
                        data.extend(fetched_data)

                    print(
                        f"Fetched {len(fetched_data)} data points for instrument {short_name} from {current_start} to {current_end}."
                    )
                else:
                    print(
                        f"No data returned for period {current_start} to {current_end}"
                    )

            except Exception as inner_e:
                print(
                    f"Error fetching chunk {current_start} to {current_end}: {inner_e}"
                )
                # Continue with next chunk despite errors

            # Update progress
            completed_chunks += 1
            progress = 5 + (completed_chunks / total_chunks * 85)  # Scale to 5-90%
            instrument.percentage.percentage = min(progress, 90)
            instrument.percentage.save()

        # Final update to set percentage to 90% before completion
        instrument.percentage.percentage = 90
        instrument.percentage.save()

    except Exception as e:
        print(
            f"Error in fetch_historical_data for instrument {short_name}: {e}",
            exc_info=True,
        )

    # Only return collected data if no callback was used
    return data


def resample_qs(inst_id: int, minutes: int):
    anchor = "1970-01-01 09:15:00+05:30"  # NSE session open
    bucket = Func(
        Value(f"{minutes} minutes"),
        F("date"),
        Value(anchor),
        function="date_bin",
        output_field=models.DateTimeField(),
    )

    qs = (
        Candle.objects.filter(instrument_id=inst_id)
        .annotate(bucket=bucket)
        .annotate(
            o=Window(
                FirstValue("open"), partition_by=[F("bucket")], order_by=F("date").asc()
            ),
            c=Window(
                FirstValue("close"),  # ← here
                partition_by=[F("bucket")],
                order_by=F("date").desc(),
            ),  # ← and here
            h_=Window(Max("high"), partition_by=[F("bucket")]),
            l_=Window(Min("low"), partition_by=[F("bucket")]),
            v_=Window(Sum(Coalesce("volume", Value(0.0))), partition_by=[F("bucket")]),
            rn=Window(
                RowNumber(), partition_by=[F("bucket")], order_by=F("date").asc()
            ),
        )
        .filter(rn=1)
        .values("bucket", "o", "h_", "l_", "c", "v_")
        .order_by("-bucket")  # ASC for the chart
    )
    return qs
