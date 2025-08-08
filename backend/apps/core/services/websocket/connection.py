from __future__ import annotations
import logging
import time
import websocket
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class AlpacaWSConnection:
    """Typed wrapper for Alpaca WebSocketApp with auto-reconnect support."""

    def __init__(
        self,
        url: str,
        api_key: str,
        secret_key: str,
        on_open: Callable[[websocket.WebSocketApp], None],
        on_message: Callable[[websocket.WebSocketApp, str], None],
        on_error: Callable[[websocket.WebSocketApp, Exception], None],
        on_close: Callable[
            [websocket.WebSocketApp, Optional[int], Optional[str]], None
        ],
        reconnect_delay: int = 10,
    ) -> None:
        self.url = url
        self.api_key = api_key
        self.secret_key = secret_key
        self.on_open = on_open
        self.on_message = on_message
        self.on_error = on_error
        self.on_close = on_close
        self.reconnect_delay = reconnect_delay
        self.ws_app: Optional[websocket.WebSocketApp] = None

    def connect(self) -> None:
        """Build WebSocketApp."""
        self.ws_app = websocket.WebSocketApp(
            self.url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )

    def run_forever(self) -> None:
        """Run WebSocket with automatic reconnect."""
        if not self.ws_app:
            raise RuntimeError("WebSocketApp not initialized. Call connect() first.")
        while True:
            logger.info(f"Connecting to {self.url}")
            try:
                self.ws_app.run_forever(
                    ping_interval=20, ping_timeout=10, ping_payload="keepalive"
                )
            except Exception as e:
                logger.exception("WebSocket run_forever error: %s", e)
            logger.warning(f"Reconnecting in {self.reconnect_delay}s…")
            time.sleep(self.reconnect_delay)

    def send(self, payload: dict) -> None:
        if self.ws_app and self.ws_app.sock and self.ws_app.sock.connected:
            self.ws_app.send(payload)
