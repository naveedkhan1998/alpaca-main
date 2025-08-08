from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

import requests
import websocket
from celery.utils.log import get_task_logger

if TYPE_CHECKING:
    from collections.abc import Callable, Iterable

logger = get_task_logger(__name__)


@dataclass
class AlpacaService:
    api_key: str
    secret_key: str
    base_url: str = "https://paper-api.alpaca.markets"
    data_base_url: str = "https://data.alpaca.markets"

    # ---------- Internal helpers ----------

    def _headers(self) -> dict[str, str]:
        return {
            "APCA-API-KEY-ID": self.api_key,
            "APCA-API-SECRET-KEY": self.secret_key,
        }

    def _make_request(
        self,
        method: Literal["GET", "POST"],
        url: str,
        params: dict | None = None,
        json_data: dict | None = None,
        timeout: int = 10,
    ) -> dict:
        try:
            resp = requests.request(
                method,
                url,
                headers=self._headers(),
                params=params,
                json=json_data,
                timeout=timeout,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as err:
            logger.error(f"HTTPError: {err} | URL: {url} | Params: {params}")
            raise

    # ---------- REST API Methods ----------

    def list_assets(
        self,
        symbols: Iterable[str] | None = None,
        status: Literal["active", "inactive"] | None = None,
        asset_class: Literal["us_equity", "us_option", "crypto"] = "us_equity",
        exchange: (
            Literal["AMEX", "ARCA", "BATS", "NYSE", "NASDAQ", "NYSEARCA", "OTC"] | None
        ) = None,
        attributes: (
            Iterable[
                Literal[
                    "ptp_no_exception",
                    "ptp_with_exception",
                    "ipo",
                    "has_options",
                    "options_late_close",
                ]
            ]
            | None
        ) = None,
        *,
        fallback_symbols: Iterable[str] | None = None,
    ) -> list[dict]:
        """Retrieve tradable assets from Alpaca."""
        params = {"asset_class": asset_class}
        if status:
            params["status"] = status
        if exchange:
            params["exchange"] = exchange
        if attributes:
            params["attributes"] = ",".join(attributes)
        if symbols:
            params["symbols"] = ",".join(symbols)

        url = f"{self.base_url}/v2/assets"

        try:
            return self._make_request("GET", url, params=params)
        except requests.exceptions.HTTPError as err:
            if err.response is not None and err.response.status_code == 403:
                if fallback_symbols:
                    logger.warning("403 Forbidden - Using fallback symbols")
                    return [{"symbol": sym} for sym in fallback_symbols]
                raise RuntimeError(
                    "403 Forbidden from assets endpoint - check API key permissions"
                ) from err
            raise

    def get_historic_bars(
        self,
        symbol: str,
        timeframe: str = "1T",
        start: str | None = None,
        end: str | None = None,
        limit: int = 1000,
        adjustment: Literal["raw", "split", "dividend", "all"] = "raw",
        asof: str | None = None,
        feed: Literal["sip", "iex", "boats", "otc"] = "iex",
        currency: str = "USD",
        page_token: str | None = None,
        sort: Literal["asc", "desc"] = "asc",
    ) -> dict:
        """Fetch historical bar data."""
        if not (1 <= limit <= 10000):
            raise ValueError("Limit must be between 1 and 10000")

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

        url = f"{self.data_base_url}/v2/stocks/{symbol}/bars"
        return self._make_request("GET", url, params=params)

    # ---------- WebSocket Streaming ----------

    def _on_message(self, _ws, message, callback: Callable[[dict], None] | None):
        try:
            parsed = json.loads(message)
            callback(parsed) if callback else logger.info(f"WS Message: {parsed}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse WS message: {e}")

    def _on_error(self, _ws, error):
        logger.error(f"WebSocket error: {error}")

    def _on_close(self, _ws, code, msg):
        logger.info(f"WebSocket closed (code={code}, message={msg})")

    def _on_open(self, ws, channels, auth_via_headers):
        if not auth_via_headers:
            ws.send(
                json.dumps(
                    {"action": "auth", "key": self.api_key, "secret": self.secret_key}
                )
            )
            time.sleep(0.5)
        if channels:
            sub_msg = {"action": "subscribe"}
            sub_msg.update(channels)
            ws.send(json.dumps(sub_msg))

    def stream(
        self,
        symbols: Iterable[str],
        on_message: Callable[[dict], None] | None = None,
        channels: dict[str, Iterable[str]] | None = None,
        feed: Literal[
            "sip", "iex", "delayed_sip", "boats", "overnight", "test"
        ] = "iex",
        auth_via_headers: bool = False,
        sandbox: bool = False,
    ) -> None:
        """Stream real-time market data via WebSocket."""
        if not symbols and not channels:
            raise ValueError("No symbols or channels provided for streaming")

        base_domain = (
            "stream.data.sandbox.alpaca.markets"
            if sandbox
            else "stream.data.alpaca.markets"
        )
        ws_url = (
            f"wss://{base_domain}/v1beta1/{feed}"
            if feed in ["boats", "overnight"]
            else f"wss://{base_domain}/v2/{feed}"
        )

        subscription_channels = channels or {"trades": list(symbols)}

        headers = None
        if auth_via_headers:
            headers = [
                f"APCA-API-KEY-ID: {self.api_key}",
                f"APCA-API-SECRET-KEY: {self.secret_key}",
            ]

        ws_app = websocket.WebSocketApp(
            ws_url,
            header=headers,
            on_open=lambda ws: self._on_open(
                ws, subscription_channels, auth_via_headers
            ),
            on_message=lambda ws, msg: self._on_message(ws, msg, on_message),
            on_error=self._on_error,
            on_close=self._on_close,
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
    ):
        """Unsubscribe from channels during an active WebSocket session."""
        if ws_app and channels:
            unsub_msg = {"action": "unsubscribe"}
            unsub_msg.update({ch: list(symbols) for ch, symbols in channels.items()})
            ws_app.send(json.dumps(unsub_msg))
