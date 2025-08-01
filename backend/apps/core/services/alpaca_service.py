"""
alpaca_service.py
===================

This module provides a simple wrapper around the Alpaca REST and WebSocket APIs
to fetch a list of tradable symbols, retrieve historical bar data, and stream
real-time market data.  The implementation uses the free IEX data feed, which
is available on Alpaca's Basic plan:contentReference[oaicite:0]{index=0}.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Callable, Iterable, List, Optional, Literal
import requests
import websocket
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@dataclass
class AlpacaService:
    api_key: str
    secret_key: str
    base_url: str = "https://paper-api.alpaca.markets"
    data_base_url: str = "https://data.alpaca.markets"

    def _headers(self) -> dict[str, str]:
        return {
            "APCA-API-KEY-ID": self.api_key,
            "APCA-API-SECRET-KEY": self.secret_key,
        }

    def list_assets(
        self,
        symbols: Optional[Iterable[str]] = None,
        status: Optional[Literal["active", "inactive"]] = None,
        asset_class: Literal["us_equity", "us_option", "crypto"] = "us_equity",
        exchange: Optional[
            Literal["AMEX", "ARCA", "BATS", "NYSE", "NASDAQ", "NYSEARCA", "OTC"]
        ] = None,
        attributes: Optional[
            Iterable[
                Literal[
                    "ptp_no_exception",
                    "ptp_with_exception",
                    "ipo",
                    "has_options",
                    "options_late_close",
                ]
            ]
        ] = None,
        *,
        fallback_symbols: Optional[Iterable[str]] = None,
    ) -> List[dict]:
        """Retrieve a list of assets from the trading API.

        Args:
            symbols: Optional list of specific symbols to filter by. If provided, only these symbols will be returned.
            status: Filter by asset status ("active" or "inactive"). By default, all statuses are included.
            asset_class: Asset class to filter by. Defaults to "us_equity".
            exchange: Exchange to filter by (AMEX, ARCA, BATS, NYSE, NASDAQ, NYSEARCA, OTC).
            attributes: Asset attributes to filter by. Assets with any of the given attributes will be included.
                       Supported values: ptp_no_exception, ptp_with_exception, ipo, has_options, options_late_close.
            fallback_symbols: Fallback symbol list if 403 Forbidden is returned (e.g. when using data-only keys).

        Returns:
            List of asset dictionaries containing asset information.

        Raises:
            RuntimeError: If 403 Forbidden is returned and no fallback symbols are provided.
            requests.exceptions.HTTPError: For other HTTP errors.
        """
        url = f"{self.base_url}/v2/assets"
        params = {"asset_class": asset_class}

        if status:
            params["status"] = status
        if exchange:
            params["exchange"] = exchange
        if attributes:
            params["attributes"] = ",".join(attributes)
        if symbols:
            params["symbols"] = ",".join(symbols)

        try:
            response = requests.get(
                url, params=params, headers=self._headers(), timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as err:
            if err.response is not None and err.response.status_code == 403:
                if fallback_symbols is not None:
                    return [{"symbol": sym} for sym in fallback_symbols]
                raise RuntimeError(
                    "Received 403 Forbidden from the assets endpoint.  "
                    "Ensure you are using Alpaca trading API keys (paper or live)."
                ) from err
            raise

    def get_historic_bars(
        self,
        symbol: str,
        timeframe: str = "1T",
        start: Optional[str] = None,
        end: Optional[str] = None,
        limit: int = 1000,
        adjustment: Literal["raw", "split", "dividend", "all"] = "raw",
        asof: Optional[str] = None,
        feed: Literal["sip", "iex", "boats", "otc"] = "iex",
        currency: str = "USD",
        page_token: Optional[str] = None,
        sort: Literal["asc", "desc"] = "asc",
    ) -> dict:
        """Fetch historical bar data via the market data API.

        Args:
            symbol: The symbol to query.
            timeframe: The timeframe for each bar. Examples:
                      - [1-59]Min or [1-59]T (e.g. "5Min", "5T" for 5-minute bars)
                      - [1-23]Hour or [1-23]H (e.g. "12Hour", "12H" for 12-hour bars)
                      - "1Day" or "1D" for daily bars
                      - "1Week" or "1W" for weekly bars
                      - [1,2,3,4,6,12]Month or [1,2,3,4,6,12]M (e.g. "3Month", "3M")
            start: Inclusive start of interval (RFC-3339 or YYYY-MM-DD). Defaults to beginning of current day.
            end: Inclusive end of interval (RFC-3339 or YYYY-MM-DD). Defaults to current time or 15min ago.
            limit: Maximum number of data points (1-10000). Defaults to 1000.
            adjustment: Corporate action adjustment type. Defaults to "raw".
            asof: As-of date for symbol mapping (YYYY-MM-DD). Use "-" to skip mapping.
            feed: Data source feed. Defaults to "sip".
            currency: Currency for prices in ISO 4217 format. Defaults to "USD".
            page_token: Pagination token to continue from.
            sort: Sort order for data. Defaults to "asc".

        Returns:
            Dictionary containing bars data, symbol, currency, and pagination info.

        Raises:
            ValueError: If limit is out of range or timeframe is invalid.
            requests.exceptions.HTTPError: For HTTP errors.
        """
        if not (1 <= limit <= 10000):
            raise ValueError("Limit must be between 1 and 10000")

        url = f"{self.data_base_url}/v2/stocks/{symbol}/bars"
        params = {
            "timeframe": timeframe,
            "limit": limit,
            "adjustment": adjustment,
            "feed": feed,
            "currency": currency,
            "sort": sort,
        }

        if start:
            params["start"] = start
        if end:
            params["end"] = end
        if asof:
            params["asof"] = asof
        if page_token:
            params["page_token"] = page_token

        response = requests.get(url, params=params, headers=self._headers(), timeout=10)
        response.raise_for_status()
        return response.json()

    def stream(
        self,
        symbols: Iterable[str],
        on_message: Optional[Callable[[dict], None]] = None,
        channels: Optional[dict[str, Iterable[str]]] = None,
        feed: Literal[
            "sip", "iex", "delayed_sip", "boats", "overnight", "test"
        ] = "iex",
        auth_via_headers: bool = False,
        sandbox: bool = False,
    ) -> None:
        """Stream real-time data over websockets for the given symbols.

        Args:
            symbols: List of symbols to stream. Use ["*"] for all symbols on supported channels.
            on_message: Callback function to handle incoming messages. If None, messages are printed.
            channels: Dictionary mapping channel names to symbol lists. Available channels:
                     - trades: Real-time trade data
                     - quotes: Real-time quote data
                     - bars: Minute bar aggregates
                     - dailyBars: Daily bar aggregates
                     - updatedBars: Updated minute bars (late trades)
                     - statuses: Trading status messages
                     - lulds: Limit Up-Limit Down messages
                     - corrections: Trade corrections (auto-subscribed with trades)
                     - cancelErrors: Trade cancellations/errors (auto-subscribed with trades)
                     - imbalances: Order imbalance messages
            feed: Data feed source. Options: sip, iex, delayed_sip, boats, overnight, test.
            auth_via_headers: If True, authenticate via WebSocket headers instead of message.
            sandbox: If True, use sandbox environment.

        Raises:
            ValueError: If no symbols or invalid configuration provided.
        """
        if not symbols and not channels:
            raise ValueError("No symbols or channels provided for streaming")

        # Build WebSocket URL
        base_domain = (
            "stream.data.sandbox.alpaca.markets"
            if sandbox
            else "stream.data.alpaca.markets"
        )

        if feed in ["boats", "overnight"]:
            ws_url = f"wss://{base_domain}/v1beta1/{feed}"
        else:
            ws_url = f"wss://{base_domain}/v2/{feed}"

        syms = list(symbols) if symbols else []

        # Prepare subscription channels
        if channels is None:
            # Default to trades to get real-time trades for ltp calculations
            subscription_channels = {"trades": syms}
        else:
            subscription_channels = {
                ch: list(symbols) for ch, symbols in channels.items()
            }

        def _on_message(ws, message):
            try:
                parsed = json.loads(message)
                if on_message:
                    on_message(parsed)
                else:
                    logger.info(f"Received WebSocket message: {parsed}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse message: {e}")

        def _on_error(ws, error):
            logger.error(f"WebSocket error: {error}")

        def _on_close(ws, close_status_code, close_msg):
            logger.info(
                f"WebSocket closed with code={close_status_code}, message={close_msg}"
            )

        def _on_open(ws):
            # Authenticate if not using headers
            if not auth_via_headers:
                auth_msg = {
                    "action": "auth",
                    "key": self.api_key,
                    "secret": self.secret_key,
                }
                ws.send(json.dumps(auth_msg))
                time.sleep(0.5)

            # Subscribe to channels
            if subscription_channels:
                sub_msg = {"action": "subscribe"}
                sub_msg.update(subscription_channels)
                ws.send(json.dumps(sub_msg))

        # Prepare headers for authentication if requested
        headers = None
        if auth_via_headers:
            headers = [
                f"APCA-API-KEY-ID: {self.api_key}",
                f"APCA-API-SECRET-KEY: {self.secret_key}",
            ]

        ws_app = websocket.WebSocketApp(
            ws_url,
            header=headers,
            on_open=_on_open,
            on_message=_on_message,
            on_error=_on_error,
            on_close=_on_close,
        )

        try:
            logger.info(f"Connecting to {ws_url}")
            ws_app.run_forever()
        except KeyboardInterrupt:
            logger.info("Streaming stopped by user")
        finally:
            ws_app.close()

    def unsubscribe(
        self, ws_app: websocket.WebSocketApp, channels: dict[str, Iterable[str]]
    ) -> None:
        """Unsubscribe from specific channels during an active stream.

        Args:
            ws_app: Active WebSocket connection
            channels: Dictionary mapping channel names to symbol lists to unsubscribe from
        """
        if ws_app and channels:
            unsub_msg = {"action": "unsubscribe"}
            unsub_msg.update({ch: list(symbols) for ch, symbols in channels.items()})
            ws_app.send(json.dumps(unsub_msg))
