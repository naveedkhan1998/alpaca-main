"""
Backwards-compatibility layer for the WebSocket service.

Historically this module contained a large monolithic implementation. The logic
has been refactored into the modular package located at
`apps.core.services.websocket`. This shim re-exports the public client class so
imports like `from apps.core.services.websocket_service import WebsocketClient`
continue to work without changes.
"""

from .websocket import WebsocketClient  # re-export

__all__ = ["WebsocketClient"]
