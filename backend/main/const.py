"""
Shared constants for the backend.

Note: For cache key helpers, import from `main.cache_keys` directly:
    from main.cache_keys import cache_keys
"""

from datetime import timedelta

from main.cache_keys import (
    AUTH_PROVIDERS,
    WEBSOCKET_HEARTBEAT_KEY,
    WEBSOCKET_HEARTBEAT_TTL,
)

__all__ = [
    "AUTH_PROVIDERS",
    "WEBSOCKET_HEARTBEAT_KEY",
    "WEBSOCKET_HEARTBEAT_TTL",
    # Timeframe labels
    "TF_1T",
    "TF_5T",
    "TF_15T",
    "TF_30T",
    "TF_1H",
    "TF_4H",
    "TF_1D",
]


# Deprecated cache key wrappers removed; use `cache_keys` directly


# Named timeframe constants for consistency across services
TF_1T = "1T"
TF_5T = "5T"
TF_15T = "15T"
TF_30T = "30T"
TF_1H = "1H"
TF_4H = "4H"
TF_1D = "1D"

TF_LIST = [
    (TF_1T, timedelta(minutes=1)),
    (TF_5T, timedelta(minutes=5)),
    (TF_15T, timedelta(minutes=15)),
    (TF_30T, timedelta(minutes=30)),
    (TF_1H, timedelta(hours=1)),
    (TF_4H, timedelta(hours=4)),
    (TF_1D, timedelta(days=1)),
]

TF_CFG = {
    TF_1T: timedelta(minutes=1),
    TF_5T: timedelta(minutes=5),
    TF_15T: timedelta(minutes=15),
    TF_30T: timedelta(minutes=30),
    TF_1H: timedelta(hours=1),
    TF_4H: timedelta(hours=4),
    TF_1D: timedelta(days=1),
}
