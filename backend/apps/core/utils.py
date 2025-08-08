from django.db import connection, models
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
from rest_framework.exceptions import ValidationError

from apps.core.models import Candle


def get_timeframe(request):
    """Extract and validate the timeframe (tf) parameter from the request.
    Important as this field is passed to raw SQL queries."""
    try:
        tf = int(request.query_params.get("tf", 1))
    except (ValueError, TypeError):
        raise ValidationError(
            "Timeframe (tf) must be a number between 1 and 1440."
        ) from None

    if not (1 <= tf <= 1440):
        raise ValidationError(
            "Timeframe (tf) must be between 1 (minute) and 1440 (minutes in a day)."
        )
    return tf


def resample_qs(asset_id: int, minutes: int):
    anchor = "1970-01-01 09:30:00-05:00"  # US market open (Eastern Time)
    bucket = Func(
        Value(f"{minutes} minutes"),
        F("timestamp"),
        Value(anchor),
        function="date_bin",
        output_field=models.DateTimeField(),
    )

    qs = (
        Candle.objects.filter(asset_id=asset_id)
        .annotate(bucket=bucket)
        .annotate(
            o=Window(
                FirstValue("open"),
                partition_by=[F("bucket")],
                order_by=F("timestamp").asc(),
                output_field=models.FloatField(),
            ),
            c=Window(
                FirstValue("close"),
                partition_by=[F("bucket")],
                order_by=F("timestamp").desc(),
                output_field=models.FloatField(),
            ),
            h_=Window(
                Max("high"),
                partition_by=[F("bucket")],
                output_field=models.FloatField(),
            ),
            l_=Window(
                Min("low"), partition_by=[F("bucket")], output_field=models.FloatField()
            ),
            v_=Window(
                Sum(Coalesce("volume", Value(0))),
                partition_by=[F("bucket")],
                output_field=models.BigIntegerField(),
            ),
            rn=Window(
                RowNumber(),
                partition_by=[F("bucket")],
                order_by=F("timestamp").asc(),
                output_field=models.IntegerField(),
            ),
        )
        .filter(rn=1)
        .values("bucket", "o", "h_", "l_", "c", "v_")
        .order_by("-bucket")  # DESC for newest first
    )
    return qs


def get_aggregated_candles(asset_id, minutes, offset, limit):
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT bucket, o, h_, l_, c, v_
            FROM (
                SELECT
                    date_bin(INTERVAL '{minutes} minutes', timestamp, TIMESTAMP '1970-01-01 09:30:00-05:00') as bucket,
                    first_value(open) OVER w as o,
                    max(high) OVER w as h_,
                    min(low) OVER w as l_,
                    first_value(close) OVER w2 as c,
                    sum(volume) OVER w as v_,
                    row_number() OVER w as rn
                FROM core_candle
                WHERE asset_id = %s
                WINDOW
                    w AS (PARTITION BY date_bin(INTERVAL '{minutes} minutes', timestamp, TIMESTAMP '1970-01-01 09:30:00-05:00') ORDER BY timestamp ASC),
                    w2 AS (PARTITION BY date_bin(INTERVAL '{minutes} minutes', timestamp, TIMESTAMP '1970-01-01 09:30:00-05:00') ORDER BY timestamp DESC)
            ) t
            WHERE rn = 1
            ORDER BY bucket DESC
            OFFSET %s LIMIT %s
        """,
            [asset_id, offset, limit],
        )
        rows = cursor.fetchall()
    return [
        {"bucket": r[0], "o": r[1], "h_": r[2], "l_": r[3], "c": r[4], "v_": r[5]}
        for r in rows
    ]
