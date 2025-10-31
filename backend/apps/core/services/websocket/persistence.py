from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from django.db import transaction

from apps.core.models import Candle
from main import const


@dataclass
class CandleRepository:
    """Persistence layer for candle upserts and lookups."""

    def save_candles(
        self,
        timeframe: str,
        updates: dict[tuple[int, datetime], dict[str, Any]],
        *,
        write_mode: str = "delta",  # "delta" for 1T incremental, "snapshot" for higher-TF open buckets
        logger=None,
    ) -> None:
        """Upsert a batch of candles for a given timeframe.

        Strategy: fetch existing rows keyed by (asset_id, timestamp, timeframe),
        then use bulk_create(ignore_conflicts=True) + bulk_update to merge.

        write_mode:
          - "delta": volumes are added to existing (used for 1T from live trades)
          - "snapshot": volumes replace existing (used for higher TF open-bucket snapshots)
        """
        if not updates:
            return

        keys = list(updates.keys())
        existing = {
            (c.asset_id, c.timestamp): c
            for c in Candle.objects.filter(
                asset_id__in=[k[0] for k in keys],
                timestamp__in=[k[1] for k in keys],
                timeframe=timeframe,
            )
        }

        snapshot = write_mode == "snapshot"
        to_create, to_update = [], []
        for (aid, ts), data in updates.items():
            if (aid, ts) in existing:
                c = existing[(aid, ts)]
                # Merge
                if c.open is None and data.get("open") is not None:
                    c.open = data["open"]
                c.high = (
                    max(c.high, data.get("high"))
                    if c.high is not None and data.get("high") is not None
                    else (c.high if c.high is not None else data.get("high"))
                )
                c.low = (
                    min(c.low, data.get("low"))
                    if c.low is not None and data.get("low") is not None
                    else (c.low if c.low is not None else data.get("low"))
                )
                c.close = data.get("close", c.close)
                # Volume handling: replace for snapshots, add for deltas
                incoming_vol = data.get("volume") or 0
                if snapshot:
                    c.volume = incoming_vol
                else:
                    c.volume = (c.volume or 0) + incoming_vol
                # merge minute ids if provided
                mids = data.get("minute_candle_ids")
                if mids:
                    existing_mids = set(c.minute_candle_ids or [])
                    for mid in mids:
                        if mid not in existing_mids:
                            existing_mids.add(mid)
                    c.minute_candle_ids = list(existing_mids)
                to_update.append(c)
            else:
                to_create.append(
                    Candle(
                        asset_id=aid,
                        timeframe=timeframe,
                        timestamp=ts,
                        open=data.get("open"),
                        high=data.get("high"),
                        low=data.get("low"),
                        close=data.get("close"),
                        volume=data.get("volume") or 0,
                        minute_candle_ids=data.get("minute_candle_ids"),
                    )
                )

        try:
            with transaction.atomic():
                if to_create:
                    Candle.objects.bulk_create(to_create, ignore_conflicts=True)
                    if logger:
                        logger.debug(
                            "upsert: created %d %s candles", len(to_create), timeframe
                        )
                if to_update:
                    Candle.objects.bulk_update(
                        to_update,
                        ["open", "high", "low", "close", "volume", "minute_candle_ids"],
                    )
                    if logger:
                        logger.debug(
                            "upsert: updated %d %s candles", len(to_update), timeframe
                        )
        except Exception:  # noqa: BLE001
            if logger:
                logger.exception("bulk save failed for timeframe %s", timeframe)

    def fetch_minute_ids(
        self, recent_minute_keys: list[tuple[int, datetime]]
    ) -> dict[tuple[int, datetime], int]:
        """Return mapping of (asset_id, minute_ts) -> Candle.id for 1T candles."""
        if not recent_minute_keys:
            return {}
        asset_ids = list({k[0] for k in recent_minute_keys})
        minutes = [k[1] for k in recent_minute_keys]
        existing = Candle.objects.filter(
            asset_id__in=asset_ids, timestamp__in=minutes, timeframe=const.TF_1T
        ).values_list("asset_id", "timestamp", "id")
        out: dict[tuple[int, datetime], int] = {}
        for aid, ts, cid in existing:
            out[(aid, ts)] = cid
        return out
