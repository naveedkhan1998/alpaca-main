import json
from unittest.mock import patch

import pytest
import requests

from apps.core.services.alpaca_service import AlpacaService
from apps.core.services.websocket.client import WebsocketClient


@pytest.fixture(autouse=True)
def isolated_feed_selection():
    with patch.object(AlpacaService, "_selected_feeds", {}):
        yield


def response(status=200, message=""):
    result = requests.Response()
    result.status_code = status
    result._content = json.dumps({"message": message}).encode()
    return result


def test_sip_is_probed_first_and_reused_across_service_instances():
    with patch(
        "apps.core.services.alpaca_service.requests.request",
        return_value=response(),
    ) as request:
        assert (
            AlpacaService(api_key="key", secret_key="secret").resolve_stock_feed()
            == "sip"
        )
        assert (
            AlpacaService(api_key="key", secret_key="secret").resolve_stock_feed()
            == "sip"
        )
    request.assert_called_once()
    assert request.call_args.args[1].endswith("/v2/stocks/AAPL/bars/latest")
    assert request.call_args.kwargs["params"] == {"feed": "sip"}


def test_sip_entitlement_denial_falls_back_and_reuses_iex():
    with patch(
        "apps.core.services.alpaca_service.requests.request",
        side_effect=[
            response(403, "subscription does not permit querying recent SIP data"),
            response(),
        ],
    ) as request:
        assert AlpacaService().resolve_stock_feed() == "iex"
        assert AlpacaService().resolve_stock_feed() == "iex"
    assert [call.kwargs["params"]["feed"] for call in request.call_args_list] == [
        "sip",
        "iex",
    ]


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_unrelated_errors_do_not_downgrade_or_cache_selection(status):
    service = AlpacaService(max_retries=0)
    with patch(
        "apps.core.services.alpaca_service.requests.request",
        side_effect=[response(status, "request failed"), response()],
    ) as request:
        with pytest.raises(requests.HTTPError):
            service.resolve_stock_feed()
        assert service.resolve_stock_feed() == "sip"
    assert request.call_count == 2
    assert all(
        call.kwargs["params"] == {"feed": "sip"} for call in request.call_args_list
    )


def test_network_failure_does_not_cache_iex():
    with (
        patch(
            "apps.core.services.alpaca_service.requests.request",
            side_effect=requests.Timeout,
        ),
        pytest.raises(requests.Timeout),
    ):
        AlpacaService(max_retries=0).resolve_stock_feed()
    assert AlpacaService._selected_feeds == {}


def test_iex_failure_does_not_cache_success():
    with (
        patch(
            "apps.core.services.alpaca_service.requests.request",
            side_effect=[response(403, "SIP subscription required"), response(401)],
        ),
        pytest.raises(requests.HTTPError),
    ):
        AlpacaService().resolve_stock_feed()
    assert AlpacaService._selected_feeds == {}


def test_selection_is_scoped_to_credentials_and_endpoint():
    with patch(
        "apps.core.services.alpaca_service.requests.request",
        return_value=response(),
    ) as request:
        AlpacaService(api_key="key", secret_key="first").resolve_stock_feed()
        AlpacaService(api_key="key", secret_key="second").resolve_stock_feed()
        AlpacaService(
            api_key="key",
            secret_key="first",
            data_base_url="https://data.sandbox.alpaca.markets",
        ).resolve_stock_feed()
    assert request.call_count == 3
    assert all(
        "first" not in str(key) and "second" not in str(key)
        for key in AlpacaService._selected_feeds
    )


@pytest.mark.parametrize("sip_available", [True, False])
def test_websocket_and_rest_share_automatic_selection(sip_available):
    expected = "sip" if sip_available else "iex"
    responses = (
        [response()]
        if sip_available
        else [
            response(403, "subscription does not permit querying recent SIP data"),
            response(),
        ]
    )
    responses.append(response())
    with (
        patch.object(WebsocketClient, "_connect"),
        patch.object(
            WebsocketClient, "_get_api_credentials", return_value=("key", "secret")
        ),
        patch(
            "apps.core.services.alpaca_service.requests.request",
            side_effect=responses,
        ) as request,
    ):
        client = WebsocketClient()
        assert client._get_stocks_url().endswith(f"/v2/{expected}")
        service = AlpacaService(api_key="key", secret_key="secret")
        service.get_historic_bars("MSFT")
        assert request.call_args.kwargs["params"]["feed"] == expected
        assert request.call_count == (2 if sip_available else 3)


@pytest.mark.parametrize("asset_class", ["crypto", "us_option"])
def test_non_stock_history_does_not_probe_stock_entitlement(asset_class):
    with patch(
        "apps.core.services.alpaca_service.requests.request",
        return_value=response(),
    ) as request:
        AlpacaService().get_historic_bars(
            "BTC/USD" if asset_class == "crypto" else "AAPL260116C00150000",
            asset_class=asset_class,
        )
    request.assert_called_once()
    assert "feed" not in request.call_args.kwargs["params"]


def test_explicit_request_feed_does_not_probe():
    with patch(
        "apps.core.services.alpaca_service.requests.request",
        return_value=response(),
    ) as request:
        AlpacaService().get_historic_bars("AAPL", feed="iex")
    request.assert_called_once()
    assert request.call_args.kwargs["params"]["feed"] == "iex"
