"""
Centralized cache key management system.

Usage:
    from main.cache_keys import cache_keys

    # Backfill keys
    key = cache_keys.backfill(asset_id).queued()
    key = cache_keys.backfill(asset_id).running()
    key = cache_keys.backfill(asset_id).completed()

    # WebSocket keys
    key = cache_keys.websocket(user_id).lock()
    key = cache_keys.websocket(user_id).subscriptions()
    key = cache_keys.websocket(user_id).unsubscriptions()
"""

from enum import StrEnum
from typing import Final


class AuthProvider(StrEnum):
    """Supported authentication providers."""

    EMAIL = "email"
    GOOGLE = "google"
    FACEBOOK = "facebook"
    TWITTER = "twitter"


class CacheConfig:
    """Cache configuration constants."""

    WEBSOCKET_HEARTBEAT_KEY: Final[str] = "ticks_received"
    WEBSOCKET_HEARTBEAT_TTL: Final[int] = 100


class BackfillKeys:
    """Builder for backfill-related cache keys."""

    def __init__(self, asset_id: int):
        self._asset_id = asset_id

    def queued(self) -> str:
        """Key to prevent duplicate backfill tasks from being queued."""
        return f"backfill:queued:{self._asset_id}"

    def running(self) -> str:
        """Key to indicate a backfill task is currently running."""
        return f"backfill:running:{self._asset_id}"

    def completed(self) -> str:
        """Key to mark that backfill has completed for this asset."""
        return f"backfill:completed:{self._asset_id}"


class WebSocketKeys:
    """Builder for WebSocket-related cache keys."""

    def __init__(self, user_id: int):
        self._user_id = user_id

    def lock(self) -> str:
        """Key to prevent multiple WebSocket connections for the same user."""
        return f"websocket_start-user-{self._user_id}"

    def subscriptions(self) -> str:
        """Redis queue name for user subscription requests."""
        return f"user:{self._user_id}:subscriptions"

    def unsubscriptions(self) -> str:
        """Redis queue name for user unsubscription requests."""
        return f"user:{self._user_id}:unsubscriptions"


class CacheKeyManager:
    """
    Central manager for all cache keys in the application.

    Provides a fluent, discoverable interface for generating cache keys
    with proper namespacing and consistency.
    """

    def backfill(self, asset_id: int) -> BackfillKeys:
        """Get backfill cache key builder for the given asset."""
        return BackfillKeys(asset_id)

    def websocket(self, user_id: int) -> WebSocketKeys:
        """Get WebSocket cache key builder for the given user."""
        return WebSocketKeys(user_id)


# Singleton instance for app-wide use
cache_keys = CacheKeyManager()


# Expose config for backwards compatibility
AUTH_PROVIDERS = {provider.value: provider.value for provider in AuthProvider}
WEBSOCKET_HEARTBEAT_KEY = CacheConfig.WEBSOCKET_HEARTBEAT_KEY
WEBSOCKET_HEARTBEAT_TTL = CacheConfig.WEBSOCKET_HEARTBEAT_TTL
