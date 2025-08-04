"""
websocket_service.py
====================

This module provides a persistent WebSocket client for streaming real-time trade
data from Alpaca. It is designed to run as a standalone service, continuously
monitoring watchlists and dynamically updating its subscriptions.

The client handles the following key responsibilities:
- Establishes and maintains a persistent WebSocket connection.
- Authenticates with the Alpaca API using credentials from the database.
- Subscribes to real-time trades for all assets in active user watchlists.
- Periodically checks for changes in watchlists and updates subscriptions.
- Processes incoming trade ticks in batches to efficiently create and update 1-minute candles.
- Implements robust error handling and automatic reconnection logic.
"""

import json
import logging
import threading
import time
from collections import deque
from datetime import datetime
from typing import Dict, Any

import websocket
from django.db import transaction
from django.utils import timezone

from apps.core.models import AlpacaAccount, Asset, Candle, WatchListAsset

logger = logging.getLogger(__name__)


class WebsocketClient:
    """
    A persistent, high-performance WebSocket client for streaming Alpaca data.
    """

    def __init__(self, account_id: int, sandbox: bool = False):
        self.account_id = account_id
        self.sandbox = sandbox
        self.ws_app = None
        self.subscribed_symbols = set()
        self.running = False
        self.lock = threading.Lock()

        # In-memory cache for assets {symbol: asset_id}
        self.asset_cache: Dict[str, int] = {}
        # Thread-safe buffer for incoming ticks
        self.tick_buffer = deque()

        self._connect()

    def _get_ws_url(self) -> str:
        """Constructs the WebSocket URL based on the environment."""
        base_domain = (
            "stream.data.sandbox.alpaca.markets"
            if self.sandbox
            else "stream.data.alpaca.markets"
        )
        return f"wss://{base_domain}/v2/iex"

    def _get_api_credentials(self) -> tuple[str, str]:
        """Retrieves API credentials from the database."""
        try:
            account = AlpacaAccount.objects.get(id=self.account_id)
            return account.api_key, account.api_secret
        except AlpacaAccount.DoesNotExist:
            logger.error(f"AlpacaAccount with ID {self.account_id} not found.")
            raise

    def _connect(self):
        """Initializes and connects the WebSocket application."""
        self.api_key, self.secret_key = self._get_api_credentials()
        ws_url = self._get_ws_url()

        self.ws_app = websocket.WebSocketApp(
            ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )

    def run(self):
        """Starts the WebSocket client and background threads."""
        self.running = True
        # Start background threads
        threading.Thread(target=self.subscription_manager, daemon=True).start()
        threading.Thread(target=self.batch_processor, daemon=True).start()
        # Start the WebSocket connection in the main thread
        self.run_forever()

    def run_forever(self):
        """Runs the WebSocket client with automatic reconnection."""
        while self.running:
            try:
                logger.info("Connecting to WebSocket...")
                self.ws_app.run_forever()
            except Exception as e:
                logger.error(f"WebSocket run_forever error: {e}", exc_info=True)

            if self.running:
                logger.info("Reconnecting in 10 seconds...")
                time.sleep(10)

    def stop(self):
        """Stops the WebSocket client."""
        self.running = False
        if self.ws_app:
            self.ws_app.close()

    def on_open(self, ws):
        """Handles the WebSocket connection opening."""
        logger.info("WebSocket connection opened.")
        self.authenticate()
        # Immediately subscribe to the current watchlist
        self.update_subscriptions()

    def authenticate(self):
        """Sends the authentication message to Alpaca."""
        auth_msg = {
            "action": "auth",
            "key": self.api_key,
            "secret": self.secret_key,
        }
        self.ws_app.send(json.dumps(auth_msg))
        logger.info("Authentication request sent.")

    def on_message(self, ws, message):
        """
        Handles incoming WebSocket messages by adding them to a buffer.
        """
        logger.info(f"Received raw message: {message}")  # Log raw message
        try:
            data = json.loads(message)
            for item in data:
                msg_type = item.get("T")

                # Explicitly check for authentication error
                if msg_type == "error" and item.get("msg") == "authentication failed":
                    logger.error(
                        "Authentication failed! Please check your API keys and permissions."
                    )
                    self.stop()  # Stop the client on auth failure
                    return

                if msg_type == "success" and item.get("msg") == "authenticated":
                    logger.info("Successfully authenticated.")
                elif msg_type == "subscription":
                    logger.info(f"Subscription update: {item}")
                elif msg_type == "t":
                    # Add trade to buffer for batch processing
                    self.tick_buffer.append(item)
                else:
                    logger.debug(f"Received unhandled message type: {item}")
        except json.JSONDecodeError:
            logger.error(f"Failed to decode message: {message}")
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)

    def on_error(self, ws, error):
        """Handles WebSocket errors."""
        logger.error(f"WebSocket error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        """Handles the WebSocket connection closing."""
        logger.info(
            f"WebSocket connection closed: code={close_status_code}, msg={close_msg}"
        )

    def get_watchlist_symbols(self) -> set:
        """Fetches the current set of symbols from all active watchlists."""
        return set(
            WatchListAsset.objects.filter(
                watchlist__is_active=True, is_active=True
            ).values_list("asset__symbol", flat=True)
        )

    def update_asset_cache(self, symbols: set):
        """Updates the in-memory asset cache."""
        assets = Asset.objects.filter(symbol__in=symbols).values("symbol", "id")
        with self.lock:
            self.asset_cache.update({asset["symbol"]: asset["id"] for asset in assets})

    def subscription_manager(self):
        """Periodically checks for watchlist changes and updates subscriptions."""
        while self.running:
            try:
                self.update_subscriptions()
            except Exception as e:
                logger.error(f"Error in subscription manager: {e}", exc_info=True)
            time.sleep(60)  # Check for updates every 60 seconds

    def update_subscriptions(self):
        """Updates subscriptions based on watchlist changes."""
        with self.lock:
            current_symbols = self.get_watchlist_symbols()
            new_symbols = current_symbols - self.subscribed_symbols
            removed_symbols = self.subscribed_symbols - current_symbols

            if new_symbols:
                self.subscribe(list(new_symbols))
                self.subscribed_symbols.update(new_symbols)
                self.update_asset_cache(new_symbols)  # Update cache
                logger.info(f"Subscribed to new symbols: {new_symbols}")

            if removed_symbols:
                self.unsubscribe(list(removed_symbols))
                self.subscribed_symbols.difference_update(removed_symbols)
                # Optionally remove from cache
                for symbol in removed_symbols:
                    self.asset_cache.pop(symbol, None)
                logger.info(f"Unsubscribed from symbols: {removed_symbols}")

    def subscribe(self, symbols: list):
        """Subscribes to trades for the given symbols."""
        if self.ws_app and self.ws_app.sock and self.ws_app.sock.connected:
            sub_msg = {"action": "subscribe", "trades": symbols}
            self.ws_app.send(json.dumps(sub_msg))

    def unsubscribe(self, symbols: list):
        """Unsubscribes from trades for the given symbols."""
        if self.ws_app and self.ws_app.sock and self.ws_app.sock.connected:
            unsub_msg = {"action": "unsubscribe", "trades": symbols}
            self.ws_app.send(json.dumps(unsub_msg))

    def batch_processor(self):
        """Processes ticks from the buffer in batches."""
        while self.running:
            try:
                if not self.tick_buffer:
                    time.sleep(1)  # Wait if buffer is empty
                    continue

                # Drain the buffer
                ticks_to_process = []
                while self.tick_buffer:
                    ticks_to_process.append(self.tick_buffer.popleft())

                if ticks_to_process:
                    self.process_batch(ticks_to_process)

            except Exception as e:
                logger.error(f"Error in batch processor: {e}", exc_info=True)

    def process_batch(self, ticks: list):
        """
        Processes a batch of ticks to create or update candles.
        """
        candle_updates: Dict[tuple, Dict[str, Any]] = {}

        with self.lock:
            asset_cache = self.asset_cache.copy()

        for trade in ticks:
            symbol = trade.get("S")
            asset_id = asset_cache.get(symbol)

            if not asset_id:
                continue

            price = trade["p"]
            volume = trade["s"]
            timestamp = datetime.fromtimestamp(
                trade["t"] / 1_000_000_000, tz=timezone.utc
            )
            candle_ts = timestamp.replace(second=0, microsecond=0)

            key = (asset_id, candle_ts)
            if key not in candle_updates:
                candle_updates[key] = {
                    "open": price,
                    "high": price,
                    "low": price,
                    "close": price,
                    "volume": 0,
                }

            candle_updates[key]["high"] = max(candle_updates[key]["high"], price)
            candle_updates[key]["low"] = min(candle_updates[key]["low"], price)
            candle_updates[key]["close"] = price
            candle_updates[key]["volume"] += volume

        self.save_candles(candle_updates)

    def save_candles(self, candle_updates: Dict[tuple, Dict[str, Any]]):
        """
        Saves candle data to the database using bulk operations.
        """
        if not candle_updates:
            return

        existing_candles = {}
        keys = list(candle_updates.keys())

        # Fetch existing candles in one query
        existing_q = Candle.objects.filter(
            asset_id__in=[k[0] for k in keys],
            timestamp__in=[k[1] for k in keys],
            timeframe="1Min",
        )

        for candle in existing_q:
            existing_candles[(candle.asset_id, candle.timestamp)] = candle

        to_create = []
        to_update = []

        for key, data in candle_updates.items():
            asset_id, timestamp = key
            if key in existing_candles:
                candle = existing_candles[key]
                candle.high = max(candle.high, data["high"])
                candle.low = min(candle.low, data["low"])
                candle.close = data["close"]  # Always update close
                candle.volume += data["volume"]
                to_update.append(candle)
            else:
                to_create.append(
                    Candle(
                        asset_id=asset_id,
                        timeframe="1Min",
                        timestamp=timestamp,
                        open=data["open"],
                        high=data["high"],
                        low=data["low"],
                        close=data["close"],
                        volume=data["volume"],
                    )
                )

        try:
            with transaction.atomic():
                if to_create:
                    Candle.objects.bulk_create(to_create, ignore_conflicts=True)
                    logger.info(f"Created {len(to_create)} new candles.")

                if to_update:
                    Candle.objects.bulk_update(
                        to_update, ["high", "low", "close", "volume"]
                    )
                    logger.info(f"Updated {len(to_update)} existing candles.")

        except Exception as e:
            logger.error(f"Error saving candles: {e}", exc_info=True)
