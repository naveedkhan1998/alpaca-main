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
from apps.core.models import Candle


def resample_qs(asset_id: int, minutes: int):
    anchor = "1970-01-01 09:30:00-05:00"  # US market open (Eastern Time)
    bucket = Func(
        Value(f"{minutes} minutes"),
        F("timestamp"),  # Changed from "date" to "timestamp"
        Value(anchor),
        function="date_bin",
        output_field=models.DateTimeField(),
    )

    qs = (
        Candle.objects.filter(asset_id=asset_id)
        .annotate(bucket=bucket)
        .annotate(
            o=Window(
                FirstValue("open"), partition_by=[F("bucket")], order_by=F("timestamp").asc()  # Changed from "date"
            ),
            c=Window(
                FirstValue("close"),
                partition_by=[F("bucket")],
                order_by=F("timestamp").desc(),  # Changed from "date"
            ),
            h_=Window(Max("high"), partition_by=[F("bucket")]),
            l_=Window(Min("low"), partition_by=[F("bucket")]),
            v_=Window(Sum(Coalesce("volume", Value(0.0))), partition_by=[F("bucket")]),
            rn=Window(
                RowNumber(), partition_by=[F("bucket")], order_by=F("timestamp").asc()  # Changed from "date"
            ),
        )
        .filter(rn=1)
        .values("bucket", "o", "h_", "l_", "c", "v_")
        .order_by("-bucket")  # DESC for newest first
    )
    return qs
