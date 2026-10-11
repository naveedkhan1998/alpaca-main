"""Bounded, timestamp-ordered provisional minute bars.

Authoritative bars and updated bars replace these snapshots when available.
Trade IDs are scoped by asset and exchange to deduplicate replayed prints.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from .conditions import is_ohlc_eligible, is_volume_eligible


@dataclass
class MinuteBarBuilder:
    retention: timedelta = timedelta(minutes=2)
    _trades: dict[tuple[int, datetime], dict[tuple, dict[str, Any]]] = field(
        default_factory=dict
    )
    _latest: dict[int, datetime] = field(default_factory=dict)
    _authoritative: dict[int, datetime] = field(default_factory=dict)

    def ingest(
        self, asset_id: int, ts: datetime, trade: dict, *, crypto: bool = False
    ) -> dict | None:
        price = Decimal(str(trade["p"]))
        size = Decimal(str(trade.get("s", 0)))
        if not price.is_finite() or price <= 0 or not size.is_finite() or size < 0:
            raise ValueError(
                "Trade price and size must be finite, with price > 0 and size >= 0"
            )
        minute = ts.replace(second=0, microsecond=0)
        self._latest[asset_id] = max(ts, self._latest.get(asset_id, ts))
        cutoff = self._latest[asset_id] - self.retention
        for key in list(self._trades):
            if key[0] == asset_id and key[1] < cutoff:
                del self._trades[key]
        authoritative = self._authoritative.get(asset_id)
        if minute < cutoff or (authoritative is not None and minute <= authoritative):
            return None
        ledger = self._trades.setdefault((asset_id, minute), {})
        trade_id = trade.get("i")
        # Without an ID, preserve distinct otherwise-identical prints.
        key = (
            (trade.get("x"), trade_id)
            if trade_id is not None
            else ("arrival", len(ledger))
        )
        ledger[key] = {
            "ts": ts,
            "price": price,
            "size": size,
            "conditions": [] if crypto else trade.get("c", []),
        }
        prices = sorted(
            (t for t in ledger.values() if is_ohlc_eligible(t["conditions"])),
            key=lambda t: t["ts"],
        )
        if not prices:
            return None
        volume_trades = [
            t for t in ledger.values() if is_volume_eligible(t["conditions"])
        ]
        volume = sum((t["size"] for t in volume_trades), Decimal("0"))
        notional = sum((t["price"] * t["size"] for t in volume_trades), Decimal("0"))
        return {
            "open": prices[0]["price"],
            "high": max(t["price"] for t in prices),
            "low": min(t["price"] for t in prices),
            "close": prices[-1]["price"],
            "volume": volume,
            "trade_count": len(volume_trades),
            "vwap": notional / volume if volume else None,
        }

    def mark_authoritative(self, asset_id: int, minute: datetime) -> None:
        self._authoritative[asset_id] = max(
            minute, self._authoritative.get(asset_id, minute)
        )
        for key in list(self._trades):
            if key[0] == asset_id and key[1] <= minute:
                del self._trades[key]
