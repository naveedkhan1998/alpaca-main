"""
Deprecated: Use main.cache_keys instead.

This module is maintained for backwards compatibility.
New code should use the cache_keys module directly:
    from main.cache_keys import cache_keys
"""

from datetime import timedelta

from main.cache_keys import (
    AUTH_PROVIDERS,
    WEBSOCKET_HEARTBEAT_KEY,
    WEBSOCKET_HEARTBEAT_TTL,
    cache_keys,
)

__all__ = [
    "AUTH_PROVIDERS",
    "WEBSOCKET_HEARTBEAT_KEY",
    "WEBSOCKET_HEARTBEAT_TTL",
    "websocket_user_lock",
    "websocket_subscription_queue",
    "websocket_unsubscription_queue",
    "backfill_queue_lock_key",
    "backfill_running_lock_key",
    "backfill_completed_key",
]


def websocket_user_lock(user_id: int) -> str:
    """Deprecated: Use cache_keys.websocket(user_id).lock()"""
    return cache_keys.websocket(user_id).lock()


def websocket_subscription_queue(user_id: int) -> str:
    """Deprecated: Use cache_keys.websocket(user_id).subscriptions()"""
    return cache_keys.websocket(user_id).subscriptions()


def websocket_unsubscription_queue(user_id: int) -> str:
    """Deprecated: Use cache_keys.websocket(user_id).unsubscriptions()"""
    return cache_keys.websocket(user_id).unsubscriptions()


def backfill_queue_lock_key(asset_id: int) -> str:
    """Deprecated: Use cache_keys.backfill(asset_id).queued()"""
    return cache_keys.backfill(asset_id).queued()


def backfill_running_lock_key(asset_id: int) -> str:
    """Deprecated: Use cache_keys.backfill(asset_id).running()"""
    return cache_keys.backfill(asset_id).running()


def backfill_completed_key(asset_id: int) -> str:
    """Deprecated: Use cache_keys.backfill(asset_id).completed()"""
    return cache_keys.backfill(asset_id).completed()


TF_LIST = [
    ("1T", timedelta(minutes=1)),
    ("5T", timedelta(minutes=5)),
    ("15T", timedelta(minutes=15)),
    ("30T", timedelta(minutes=30)),
    ("1H", timedelta(hours=1)),
    ("4H", timedelta(hours=4)),
    ("1D", timedelta(days=1)),
]

TF_CFG = {
    "1T": timedelta(minutes=1),
    "5T": timedelta(minutes=5),
    "15T": timedelta(minutes=15),
    "30T": timedelta(minutes=30),
    "1H": timedelta(hours=1),
    "4H": timedelta(hours=4),
    "1D": timedelta(days=1),
}
