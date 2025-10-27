"""
Modular WebSocket service package.

This package provides a maintainable, testable implementation of the Alpaca
market data streaming client. It replaces the historical monolithic service with
focused modules for subscriptions, aggregation, persistence, backfill checks,
and utility helpers.

External callers should import WebsocketClient from this package or via the
legacy module `apps.core.services.websocket_service` which re-exports it for
backwards compatibility.
"""

from .client import WebsocketClient

__all__ = ["WebsocketClient"]
