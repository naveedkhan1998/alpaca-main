from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from email.utils import parsedate_to_datetime
import hashlib
import re
import threading
import time
from typing import TYPE_CHECKING, ClassVar, Literal
import unicodedata

from celery.utils.log import get_task_logger
import requests

from main import const
from main.settings.base import APCA_API_KEY, APCA_API_SECRET_KEY

if TYPE_CHECKING:
    from collections.abc import Iterable, Iterator

logger = get_task_logger(__name__)

OPTION_SYMBOL_PATTERN = re.compile(
    r"^(?P<root>.+)(?P<expiration>\d{6})(?P<type>[CP])(?P<strike>\d{8})$"
)


@dataclass
class AlpacaService:
    api_key: str = APCA_API_KEY
    secret_key: str = APCA_API_SECRET_KEY
    base_url: str = "https://paper-api.alpaca.markets"
    data_base_url: str = "https://data.alpaca.markets"
    stock_feed: str | None = None
    max_retries: int = 3
    _selected_feeds: ClassVar[dict[tuple[str, str], str]] = {}
    _feed_lock: ClassVar[threading.Lock] = threading.Lock()

    # ---------- Internal helpers ----------

    def resolve_stock_feed(self) -> str:
        """Probe real-time SIP entitlement once per credentials/endpoint/process."""
        if self.stock_feed is not None:
            return self.stock_feed
        credentials = hashlib.sha256(
            f"{self.api_key}:{self.secret_key}".encode()
        ).hexdigest()
        key = (self.data_base_url, credentials)
        with self._feed_lock:
            if key in self._selected_feeds:
                return self._selected_feeds[key]
            url = f"{self.data_base_url}/v2/stocks/AAPL/bars/latest"
            selected = "sip"
            try:
                self._make_request("GET", url, params={"feed": "sip"})
            except requests.exceptions.HTTPError as exc:
                response = exc.response
                if response is None or response.status_code != 403:
                    raise
                message = response.text.lower()
                if "subscription" not in message and "sip" not in message:
                    raise
                logger.warning("SIP access is unavailable; checking IEX instead")
                self._make_request("GET", url, params={"feed": "iex"})
                selected = "iex"
            self._selected_feeds[key] = selected
            logger.info("Selected Alpaca stock data feed: %s", selected)
            return selected

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
    ) -> dict | list[dict]:
        for attempt in range(self.max_retries + 1):
            resp = None
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
            except (
                requests.exceptions.Timeout,
                requests.exceptions.ConnectionError,
                requests.exceptions.HTTPError,
            ) as err:
                status = resp.status_code if resp is not None else None
                retryable = status is None or status == 429 or status >= 500
                if method != "GET" or not retryable or attempt == self.max_retries:
                    logger.error("Alpaca request failed: %s | URL: %s", err, url)
                    raise
                wait = min(2**attempt, 30)
                if resp is not None and status == 429:
                    retry_after = resp.headers.get("Retry-After")
                    if retry_after:
                        try:
                            wait = float(retry_after)
                        except ValueError:
                            try:
                                wait = (
                                    parsedate_to_datetime(retry_after).timestamp()
                                    - time.time()
                                )
                            except ValueError, TypeError, OverflowError:
                                logger.warning(
                                    "Invalid Alpaca Retry-After header: %r", retry_after
                                )
                wait = max(0, min(wait, 60))
                logger.warning("Retrying Alpaca request in %ss | URL: %s", wait, url)
                time.sleep(wait)
        raise RuntimeError("Alpaca request exhausted retries")

    @staticmethod
    def normalize_symbol(symbol: str, asset_class: str) -> str:
        cleaned = "".join(
            char
            for char in symbol.strip()
            if not char.isspace() and unicodedata.category(char) != "Cf"
        )
        if asset_class == "crypto":
            cleaned = cleaned.upper()
            if "/" not in cleaned and cleaned.endswith("USD"):
                cleaned = cleaned[:-3] + "/USD"
        if not cleaned:
            raise ValueError("Symbol must not be empty")
        return cleaned

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
            assets = self._make_request("GET", url, params=params)
            if not isinstance(assets, list):
                raise ValueError("Alpaca assets response must be a list")
            return assets
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
        feed: str | None = None,
        currency: str = "USD",
        page_token: str | None = None,
        sort: Literal["asc", "desc"] = "asc",
        asset_class: Literal["us_equity", "us_option", "crypto"] = "us_equity",
    ) -> dict:
        """Fetch historical bar data."""
        if not (1 <= limit <= 10000):
            raise ValueError("Limit must be between 1 and 10000")
        if asset_class not in {"us_equity", "us_option", "crypto"}:
            raise ValueError(f"Unsupported asset class: {asset_class}")
        symbol = self.normalize_symbol(symbol, asset_class)
        timeframe = {
            "1T": "1Min",
            "5T": "5Min",
            "15T": "15Min",
            "30T": "30Min",
            "1H": "1Hour",
            "4H": "4Hour",
            "1D": "1Day",
        }.get(timeframe, timeframe)

        params = {
            "timeframe": timeframe,
            "limit": limit,
            "adjustment": adjustment,
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

        if asset_class in {"crypto", "us_option"}:
            path = "v1beta3/crypto/us" if asset_class == "crypto" else "v1beta1/options"
            url = f"{self.data_base_url}/{path}/bars"
            params["symbols"] = symbol
            params.pop("feed", None)
            params.pop("adjustment", None)
            params.pop("currency", None)
            params.pop("asof", None)
            if asset_class == "us_option" and feed:
                params["feed"] = feed
            resp = self._make_request("GET", url, params=params)
            if not isinstance(resp, dict):
                raise ValueError("Alpaca historical bars response must be an object")
            bars = (resp.get("bars") or {}).get(symbol, [])
            resp["bars"] = bars
            resp["symbol"] = symbol
            return resp
        else:
            params["feed"] = feed or self.resolve_stock_feed()
            url = f"{self.data_base_url}/v2/stocks/{symbol}/bars"
            resp = self._make_request("GET", url, params=params)
            if not isinstance(resp, dict):
                raise ValueError("Alpaca historical bars response must be an object")
            return resp

    @staticmethod
    def _parse_option_symbol(option_symbol: str) -> tuple[str, str, str, float]:
        match = OPTION_SYMBOL_PATTERN.fullmatch(option_symbol)
        if match is None:
            raise ValueError(
                f"Invalid OCC option symbol returned by Alpaca: {option_symbol}"
            )

        expiration = (
            datetime.strptime(match.group("expiration"), "%y%m%d").date().isoformat()
        )
        option_type = "call" if match.group("type") == "C" else "put"
        strike_price = int(match.group("strike")) / 1000
        return match.group("root"), expiration, option_type, strike_price

    def get_option_expirations(self, symbol: str) -> dict:
        """Fetch every active expiration date available for an equity."""
        normalized = self.normalize_symbol(symbol, "us_equity")
        url = f"{self.base_url}/v2/options/contracts"
        expirations: set[str] = set()
        page_token: str | None = None
        seen_tokens: set[str] = set()

        while True:
            params = {
                "underlying_symbols": normalized,
                "status": "active",
                "expiration_date_gte": date.today().isoformat(),
                "limit": 1000,
            }
            if page_token:
                params["page_token"] = page_token

            response = self._make_request("GET", url, params=params)
            if not isinstance(response, dict):
                raise ValueError("Alpaca option contracts response must be an object")

            contracts = response.get("option_contracts")
            if not isinstance(contracts, list):
                raise ValueError(
                    "Alpaca option contracts response must include option_contracts"
                )
            for contract in contracts:
                expiration = contract.get("expiration_date")
                if expiration:
                    expirations.add(expiration)

            page_token = response.get("next_page_token")
            if not page_token:
                break
            if page_token in seen_tokens:
                raise RuntimeError(
                    "Alpaca returned a repeated option contracts page token"
                )
            seen_tokens.add(page_token)

        return {
            "underlying": normalized,
            "expirations": sorted(expirations),
        }

    def get_option_chain(self, symbol: str, expiration: str | None = None) -> dict:
        """Fetch and normalize option-chain snapshots for one expiration."""
        normalized = self.normalize_symbol(symbol, "us_equity")
        if not expiration:
            available = self.get_option_expirations(normalized)["expirations"]
            if not available:
                return {
                    "underlying": normalized,
                    "expiration": None,
                    "contracts": [],
                }
            expiration = available[0]

        url = f"{self.data_base_url}/v1beta1/options/snapshots/{normalized}"
        snapshots: dict[str, dict] = {}
        page_token: str | None = None
        seen_tokens: set[str] = set()

        while True:
            params = {"expiration_date": expiration, "limit": 1000}
            if page_token:
                params["page_token"] = page_token

            response = self._make_request("GET", url, params=params)
            if not isinstance(response, dict):
                raise ValueError("Alpaca option chain response must be an object")
            page_snapshots = response.get("snapshots")
            if not isinstance(page_snapshots, dict):
                raise ValueError(
                    "Alpaca option chain response must include a snapshots object"
                )
            snapshots.update(page_snapshots)

            page_token = response.get("next_page_token")
            if not page_token:
                break
            if page_token in seen_tokens:
                raise RuntimeError("Alpaca returned a repeated option chain page token")
            seen_tokens.add(page_token)

        contracts: list[dict] = []
        for option_symbol, snapshot in snapshots.items():
            if not isinstance(snapshot, dict):
                raise ValueError(
                    f"Alpaca snapshot for {option_symbol} must be an object"
                )
            root, contract_expiration, option_type, strike_price = (
                self._parse_option_symbol(option_symbol)
            )
            if contract_expiration != expiration:
                raise ValueError(
                    f"Alpaca returned {option_symbol} outside requested expiration "
                    f"{expiration}"
                )

            latest_quote = snapshot.get("latestQuote") or {}
            latest_trade = snapshot.get("latestTrade") or {}
            daily_bar = snapshot.get("dailyBar") or {}
            greeks = snapshot.get("greeks") or {}
            contracts.append(
                {
                    "symbol": option_symbol,
                    "underlying": root,
                    "expiration": contract_expiration,
                    "option_type": option_type,
                    "strike": strike_price,
                    "bid": latest_quote.get("bp"),
                    "ask": latest_quote.get("ap"),
                    "bid_size": latest_quote.get("bs"),
                    "ask_size": latest_quote.get("as"),
                    "last_price": latest_trade.get("p"),
                    "last_size": latest_trade.get("s"),
                    "volume": daily_bar.get("v"),
                    "trade_count": daily_bar.get("n"),
                    "vwap": daily_bar.get("vw"),
                    "open_interest": snapshot.get("openInterest"),
                    "implied_volatility": snapshot.get("impliedVolatility"),
                    "delta": greeks.get("delta"),
                    "gamma": greeks.get("gamma"),
                    "theta": greeks.get("theta"),
                    "vega": greeks.get("vega"),
                    "rho": greeks.get("rho"),
                }
            )

        contracts.sort(key=lambda contract: (contract["strike"], contract["symbol"]))
        return {
            "underlying": normalized,
            "expiration": expiration,
            "contracts": contracts,
        }

    def iter_historic_bars(self, symbol: str, **kwargs) -> Iterator[dict]:
        """Yield every page without collecting an entire history in memory."""
        seen_tokens: set[str] = set()
        while True:
            response = self.get_historic_bars(symbol, **kwargs)
            yield from response.get("bars") or []
            token = response.get("next_page_token")
            if not token:
                return
            if token in seen_tokens:
                raise RuntimeError("Alpaca returned a repeated historical page token")
            seen_tokens.add(token)
            kwargs["page_token"] = token


alpaca_service = AlpacaService()
