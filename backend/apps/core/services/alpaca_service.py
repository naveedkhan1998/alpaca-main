from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from celery.utils.log import get_task_logger
import requests

from main import const
from main.settings.base import APCA_API_KEY, APCA_API_SECRET_KEY

if TYPE_CHECKING:
    from collections.abc import Iterable

logger = get_task_logger(__name__)


@dataclass
class AlpacaService:
    api_key: str = APCA_API_KEY
    secret_key: str = APCA_API_SECRET_KEY
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
        timeframe: str = const.TF_1T,
        start: str | None = None,
        end: str | None = None,
        limit: int = 10000,
        adjustment: Literal["raw", "split", "dividend", "all"] = "raw",
        asof: str | None = None,
        feed: Literal["sip", "iex", "boats", "otc"] = "iex",
        currency: str = "USD",
        page_token: str | None = None,
        sort: Literal["asc", "desc"] = "asc",
        asset_class: Literal["us_equity", "us_option", "crypto"] = "us_equity",
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

        if asset_class == "crypto":
            # For crypto, use v1beta3 endpoint
            symbol_formatted = symbol
            url = f"{self.data_base_url}/v1beta3/crypto/us/bars"
            params["symbols"] = symbol_formatted
            # Remove params not used in crypto API
            params.pop("feed", None)
            params.pop("adjustment", None)
            params.pop("currency", None)
            resp = self._make_request("GET", url, params=params)
            # Normalize response to match stocks format
            bars = resp.get("bars", {}).get(symbol_formatted, [])
            resp["bars"] = bars
            resp["symbol"] = symbol_formatted
            return resp
        else:
            # For stocks/options
            url = f"{self.data_base_url}/v2/stocks/{symbol}/bars"
            return self._make_request("GET", url, params=params)


alpaca_service = AlpacaService()
