"""Compatibility exports for the shared candle persistence service."""

from apps.core.services.candle_cache import candle_cache
from apps.core.services.candle_persistence import (
    CandlePersistence,
    CandleRepository,
    LegacyCandleRepository,
)

__all__ = [
    "CandlePersistence",
    "CandleRepository",
    "LegacyCandleRepository",
    "candle_cache",
]
