from datetime import UTC, datetime, timedelta
from decimal import Decimal
import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
import requests

from apps.core.services.alpaca_service import AlpacaService
from apps.core.services.websocket.bar_builder import MinuteBarBuilder
from apps.core.services.websocket.client import WebsocketClient
from apps.core.tasks import _load_historical_minutes
from apps.core.views.main import AssetViewSet


def response(status=200, data=None, headers=None):
    result = requests.Response()
    result.status_code = status
    result._content = json.dumps(data or {}).encode()
    result.headers.update(headers or {})
    return result


@pytest.mark.parametrize(
    "failure",
    [
        response(429, headers={"Retry-After": "2"}),
        response(503),
        requests.Timeout(),
        requests.ConnectionError(),
    ],
)
def test_rest_retries_transient_failures(failure):
    with (
        patch(
            "apps.core.services.alpaca_service.requests.request",
            side_effect=[failure, response(data={"bars": []})],
        ) as request,
        patch("apps.core.services.alpaca_service.time.sleep") as sleep,
    ):
        assert AlpacaService(stock_feed="iex").get_historic_bars("AAPL") == {"bars": []}
        assert request.call_count == 2
        sleep.assert_called_once()


@pytest.mark.parametrize("status", [400, 401, 403, 404])
def test_rest_does_not_retry_permanent_failures(status):
    with (
        patch(
            "apps.core.services.alpaca_service.requests.request",
            return_value=response(status),
        ) as request,
        patch("apps.core.services.alpaca_service.time.sleep") as sleep,
        pytest.raises(requests.HTTPError),
    ):
        AlpacaService(stock_feed="iex").get_historic_bars("AAPL")
    assert request.call_count == 1
    sleep.assert_not_called()


def test_rest_exhaustion_raises():
    with (
        patch(
            "apps.core.services.alpaca_service.requests.request",
            return_value=response(503),
        ) as request,
        patch("apps.core.services.alpaca_service.time.sleep"),
        pytest.raises(requests.HTTPError),
    ):
        AlpacaService(max_retries=2, stock_feed="iex").get_historic_bars("AAPL")
    assert request.call_count == 3


@pytest.mark.parametrize(
    "retry_after", ["not-a-date", "100000", "Thu, 01 Jan 1970 00:00:00 GMT"]
)
def test_rate_limit_wait_is_bounded(retry_after):
    with (
        patch(
            "apps.core.services.alpaca_service.requests.request",
            side_effect=[
                response(429, headers={"Retry-After": retry_after}),
                response(),
            ],
        ),
        patch("apps.core.services.alpaca_service.time.sleep") as sleep,
    ):
        AlpacaService(stock_feed="iex").get_historic_bars("AAPL")
    assert 0 <= sleep.call_args.args[0] <= 60


@pytest.mark.parametrize(
    ("asset_class", "symbol", "normalized", "path"),
    [
        ("crypto", " btc\u200busd ", "BTC/USD", "/v1beta3/crypto/us/bars"),
        (
            "us_option",
            " AAPL260116C00150000 ",
            "AAPL260116C00150000",
            "/v1beta1/options/bars",
        ),
    ],
)
def test_historical_endpoint_normalization(asset_class, symbol, normalized, path):
    service = AlpacaService()
    with patch.object(
        service,
        "_make_request",
        return_value={"bars": {normalized: [{"v": 0.5}]}, "next_page_token": "next"},
    ) as request:
        result = service.get_historic_bars(
            symbol, asset_class=asset_class, timeframe="1T"
        )
    assert request.call_args.args[1].endswith(path)
    params = request.call_args.kwargs["params"]
    assert params["symbols"] == normalized
    assert params["timeframe"] == "1Min"
    assert not {"feed", "adjustment", "currency", "asof"} & params.keys()
    assert result["bars"] == [{"v": 0.5}]
    assert result["next_page_token"] == "next"


def test_option_expirations_are_paginated_and_normalized():
    service = AlpacaService()
    responses = [
        {
            "option_contracts": [
                {"symbol": "AAPL261016C00150000", "expiration_date": "2026-10-16"},
                {"symbol": "AAPL261023C00150000", "expiration_date": "2026-10-23"},
            ],
            "next_page_token": "next",
        },
        {
            "option_contracts": [
                {"symbol": "AAPL261023P00150000", "expiration_date": "2026-10-23"}
            ],
            "next_page_token": None,
        },
    ]
    with patch.object(service, "_make_request", side_effect=responses) as request:
        result = service.get_option_expirations(" AAPL ")

    assert request.call_count == 2
    assert request.call_args_list[0].args[1].endswith("/v2/options/contracts")
    assert request.call_args_list[1].kwargs["params"]["page_token"] == "next"
    assert result == {
        "underlying": "AAPL",
        "expirations": ["2026-10-16", "2026-10-23"],
    }


def test_option_chain_snapshots_are_normalized_for_frontend():
    service = AlpacaService()
    alpaca_response = {
        "snapshots": {
            "AAPL261016C00155000": {
                "latestQuote": {"bp": 6.0, "ap": 6.4},
            },
            "AAPL261016C00150000": {
                "latestQuote": {"bp": 9.8, "ap": 10.2, "bs": 3, "as": 5},
                "latestTrade": {"p": 10.1, "s": 2},
                "dailyBar": {"v": 42, "n": 7, "vw": 10.05},
                "greeks": {"delta": 0.61, "gamma": 0.02, "theta": -0.11, "vega": 0.09},
                "impliedVolatility": 0.31,
            },
            "AAPL261016P00150000": {
                "latestQuote": {"bp": 1.1, "ap": 1.3},
                "latestTrade": {"p": 1.2},
                "dailyBar": {"v": 21, "n": 4, "vw": 1.19},
            },
        },
        "next_page_token": None,
    }
    with patch.object(
        service, "_make_request", return_value=alpaca_response
    ) as request:
        result = service.get_option_chain("AAPL", "2026-10-16")

    assert request.call_args.args[1].endswith("/v1beta1/options/snapshots/AAPL")
    assert request.call_args.kwargs["params"] == {
        "expiration_date": "2026-10-16",
        "limit": 1000,
    }
    assert result["underlying"] == "AAPL"
    assert result["expiration"] == "2026-10-16"
    assert [contract["symbol"] for contract in result["contracts"]] == [
        "AAPL261016C00150000",
        "AAPL261016P00150000",
        "AAPL261016C00155000",
    ]
    assert result["contracts"][0] == {
        "symbol": "AAPL261016C00150000",
        "underlying": "AAPL",
        "expiration": "2026-10-16",
        "option_type": "call",
        "strike": 150.0,
        "bid": 9.8,
        "ask": 10.2,
        "bid_size": 3,
        "ask_size": 5,
        "last_price": 10.1,
        "last_size": 2,
        "volume": 42,
        "trade_count": 7,
        "vwap": 10.05,
        "open_interest": None,
        "implied_volatility": 0.31,
        "delta": 0.61,
        "gamma": 0.02,
        "theta": -0.11,
        "vega": 0.09,
        "rho": None,
    }


def test_option_chain_view_caches_each_instrument_and_expiration_for_30_seconds():
    view = AssetViewSet()
    view.get_object = Mock(return_value=SimpleNamespace(symbol="AAPL"))
    request = SimpleNamespace(query_params={"expiration": "2026-10-16"})
    chain = {
        "underlying": "AAPL",
        "expiration": "2026-10-16",
        "contracts": [],
    }

    with (
        patch("apps.core.views.main.cache") as cache,
        patch(
            "apps.core.views.main.alpaca_service.get_option_chain",
            return_value=chain,
        ) as get_chain,
    ):
        cache.get.return_value = None
        response = view.get_options_chain(request)

    get_chain.assert_called_once_with("AAPL", "2026-10-16")
    cache.set.assert_called_once_with(
        "asset_options_chain:AAPL:2026-10-16", chain, timeout=30
    )
    assert response.data["data"] == chain


def test_option_bars_view_normalizes_candles_and_caches_them():
    view = AssetViewSet()
    view.get_object = Mock(return_value=SimpleNamespace(symbol="AAPL"))
    request = SimpleNamespace(
        query_params={"symbol": "aapl261016c00150000", "timeframe": "1Min", "days": "3"}
    )
    bars = {
        "bars": [
            {"t": "2026-10-01T13:30:00Z", "o": 1, "h": 2, "l": 0.5, "c": 1.5, "v": 9}
        ]
    }

    with (
        patch("apps.core.views.main.cache") as cache,
        patch(
            "apps.core.views.main.alpaca_service.get_historic_bars",
            return_value=bars,
        ) as get_bars,
    ):
        cache.get.return_value = None
        response = view.get_options_bars(request)

    assert get_bars.call_args.args == ("AAPL261016C00150000",)
    assert get_bars.call_args.kwargs["asset_class"] == "us_option"
    assert get_bars.call_args.kwargs["timeframe"] == "1Min"
    assert response.data["data"]["candles"] == [
        {"t": "2026-10-01T13:30:00Z", "o": 1, "h": 2, "l": 0.5, "c": 1.5, "v": 9}
    ]
    cache.set.assert_called_once_with(
        "asset_option_bars:AAPL261016C00150000:1Min:3",
        response.data["data"],
        timeout=30,
    )


def test_option_expirations_view_caches_per_instrument():
    view = AssetViewSet()
    view.get_object = Mock(return_value=SimpleNamespace(symbol="AAPL"))
    request = SimpleNamespace(query_params={})
    expirations = {"underlying": "AAPL", "expirations": ["2026-10-16"]}

    with (
        patch("apps.core.views.main.cache") as cache,
        patch(
            "apps.core.views.main.alpaca_service.get_option_expirations",
            return_value=expirations,
        ) as get_expirations,
    ):
        cache.get.return_value = None
        response = view.get_options_expirations(request)

    get_expirations.assert_called_once_with("AAPL")
    cache.set.assert_called_once_with(
        "asset_options_expirations:AAPL", expirations, timeout=30
    )
    assert response.data["data"] == expirations


def test_stock_feed_and_timeframe_are_shared():
    service = AlpacaService(stock_feed="sip")
    with patch.object(service, "_make_request", return_value={}) as request:
        service.get_historic_bars("AAPL", timeframe="1H")
    assert request.call_args.kwargs["params"]["feed"] == "sip"
    assert request.call_args.kwargs["params"]["timeframe"] == "1Hour"
    with (
        patch(
            "apps.core.services.websocket.client.AlpacaService.resolve_stock_feed",
            return_value="sip",
        ),
        patch.object(WebsocketClient, "_connect"),
    ):
        assert WebsocketClient()._get_stocks_url().endswith("/v2/sip")


def test_historical_pagination_including_empty_page():
    service = AlpacaService()
    with patch.object(
        service,
        "get_historic_bars",
        side_effect=[
            {"bars": [{"t": "first"}], "next_page_token": "a"},
            {"bars": None, "next_page_token": "b"},
            {"bars": [{"t": "last"}]},
        ],
    ) as request:
        assert list(service.iter_historic_bars("AAPL", start="start")) == [
            {"t": "first"},
            {"t": "last"},
        ]
    assert request.call_args.kwargs == {"start": "start", "page_token": "b"}


def test_repeated_pagination_token_fails_explicitly():
    service = AlpacaService()
    with (
        patch.object(
            service, "get_historic_bars", return_value={"next_page_token": "a"}
        ),
        pytest.raises(RuntimeError, match="repeated"),
    ):
        list(service.iter_historic_bars("AAPL"))


def test_trade_builder_orders_timestamps_and_deduplicates_ids():
    builder = MinuteBarBuilder()
    ts = datetime(2026, 10, 8, 14, 30, tzinfo=UTC)
    builder.ingest(1, ts + timedelta(seconds=50), {"p": "101.1", "s": 20, "i": 2})
    trade = {"p": "100.1", "s": 10, "i": 1}
    builder.ingest(1, ts, trade)
    candle = builder.ingest(1, ts, trade)
    assert candle["open"] == Decimal("100.1")
    assert candle["close"] == Decimal("101.1")
    assert candle["volume"] == 30
    assert candle["trade_count"] == 2


def test_trade_eligibility_separates_prices_from_volume():
    builder = MinuteBarBuilder()
    ts = datetime(2026, 10, 8, 14, 30, tzinfo=UTC)
    assert builder.ingest(1, ts, {"p": 999, "s": 3, "c": ["I"]}) is None
    candle = builder.ingest(1, ts, {"p": 100, "s": 10})
    assert candle["high"] == 100
    assert candle["volume"] == 13
    assert candle["vwap"] == (Decimal(999) * 3 + Decimal(100) * 10) / 13


def test_crypto_fractional_volume_and_retention():
    builder = MinuteBarBuilder()
    ts = datetime(2026, 10, 8, 14, 30, tzinfo=UTC)
    candle = builder.ingest(
        1, ts, {"p": "123.12345678", "s": "0.00000001"}, crypto=True
    )
    assert candle["volume"] == Decimal("0.00000001")
    builder.ingest(1, ts + timedelta(minutes=5), {"p": 123, "s": 1}, crypto=True)
    assert (1, ts) not in builder._trades
    assert builder.ingest(1, ts, {"p": 123, "s": 1}, crypto=True) is None


@pytest.fixture
def live_client():
    with patch.object(WebsocketClient, "_connect"):
        client = WebsocketClient()
    client.subscriptions.asset_cache = {"AAPL": 1, "BTC/USD": 2}
    client.subscriptions.asset_class_cache = {1: "us_equity", 2: "crypto"}
    client.repo = Mock()
    client.aggregator = Mock(_tf_acc={})
    return client


def trade(price=100, size=10, second=1):
    return {
        "T": "t",
        "S": "AAPL",
        "p": price,
        "s": size,
        "t": f"2026-10-08T14:30:{second:02}Z",
    }


def bar(kind="b", high=101, volume=30):
    return {
        "T": kind,
        "S": "AAPL",
        "o": 100,
        "h": high,
        "l": 99,
        "c": 100,
        "v": volume,
        "n": 4,
        "vw": 100,
        "t": "2026-10-08T14:30:00Z",
    }


def test_authoritative_bar_wins_over_trades_and_late_ticks(live_client):
    live_client._process_batch([trade(999), bar(), trade(200)])
    candle = live_client.repo.upsert_minutes.call_args.args[0][0]
    assert candle["high"] == 101
    assert candle["volume"] == 30
    assert candle["trade_count"] == 4
    assert live_client.repo.upsert_minutes.call_args.kwargs["mode"] == "snapshot"
    live_client._process_batch([trade(300)])
    assert live_client.repo.upsert_minutes.call_count == 1
    live_client._process_batch([bar("u", high=100, volume=25)])
    assert live_client.repo.upsert_minutes.call_args.args[0][0]["volume"] == 25


def test_failed_batch_retries_without_reingesting_no_id_trades(live_client):
    messages = [trade()]
    live_client.repo.upsert_minutes.side_effect = [RuntimeError("DB failure"), 1, 1]
    with pytest.raises(RuntimeError, match="DB failure"):
        live_client._process_batch(messages)
    live_client._process_batch(messages)
    assert live_client.repo.upsert_minutes.call_args.args[0][0]["volume"] == 10
    live_client._process_batch([trade(101, second=2)])
    assert live_client.repo.upsert_minutes.call_args.args[0][0]["volume"] == 20


@pytest.mark.parametrize(
    "invalid",
    [
        trade(price="NaN"),
        trade(size=-1),
        {**trade(), "t": "bad timestamp"},
        {**bar(), "h": "Infinity"},
    ],
)
def test_malformed_message_does_not_poison_batch(live_client, invalid):
    with patch("apps.core.services.websocket.client.logger") as logger:
        live_client._process_batch([trade(), invalid, trade(101, second=2)])
    logger.exception.assert_called_once()
    assert live_client.repo.upsert_minutes.call_args.args[0][0]["volume"] == 20


def test_backfill_buffers_authoritative_bars_and_replays_when_idle(live_client):
    from main.cache_keys import cache_keys

    with patch(
        "apps.core.services.websocket.client.cache.get_many",
        return_value={cache_keys.backfill(1).running(): 1},
    ):
        live_client._process_batch([trade(), bar()])
    live_client.repo.upsert_minutes.assert_not_called()
    live_client._process_batch([])
    assert live_client.repo.upsert_minutes.call_args.args[0][0]["volume"] == 30
    assert live_client._replay_buffer == {}


def test_stock_auth_does_not_enable_crypto_subscription(live_client):
    live_client.ws_crypto = Mock()
    live_client._mark_authenticated("stocks")
    live_client._send_subscription_crypto("subscribe", ["BTC/USD"])
    live_client.ws_crypto.send.assert_not_called()


def test_reconnect_restores_existing_subscriptions(live_client):
    live_client.ws_stocks = Mock()
    live_client._mark_authenticated("stocks")
    live_client.subscriptions.subscribed_symbols = {"AAPL"}
    with patch.object(live_client, "_update_subscriptions"):
        live_client._restore_subscriptions("stocks")
    payload = json.loads(live_client.ws_stocks.send.call_args.args[0])
    assert payload["bars"] == ["AAPL"]
    assert payload["updatedBars"] == ["AAPL"]


def test_crypto_close_does_not_reset_stock_auth(live_client):
    live_client.ws_crypto = Mock()
    live_client._mark_authenticated("stocks")
    live_client._mark_authenticated("crypto")
    live_client.on_close(live_client.ws_crypto)
    assert live_client._socket_authenticated == {"stocks": True, "crypto": False}
    assert live_client.authenticated


def test_historical_loader_preserves_crypto_weekends_and_decimals():
    start = datetime(2026, 10, 10, tzinfo=UTC)
    raw = {
        "t": start.isoformat(),
        "o": "1.12345678",
        "h": 2,
        "l": 1,
        "c": 2,
        "v": "0.001",
    }
    asset = SimpleNamespace(id=2, symbol="BTC/USD", asset_class="crypto")
    with (
        patch(
            "apps.core.tasks.alpaca_service.iter_historic_bars",
            return_value=iter([raw]),
        ),
        patch("apps.core.tasks.CandlePersistence") as persistence,
    ):
        persistence.return_value.upsert_minutes.return_value = 1
        assert _load_historical_minutes(asset, start, start + timedelta(days=1)) == 1
    candle = persistence.return_value.upsert_minutes.call_args.args[0][0]
    assert candle["volume"] == Decimal("0.001")
    assert candle["open"] == Decimal("1.12345678")


def test_historical_loader_failure_propagates():
    asset = SimpleNamespace(id=1, symbol="AAPL", asset_class="us_equity")
    start = datetime(2026, 10, 8, tzinfo=UTC)
    with (
        patch(
            "apps.core.tasks.alpaca_service.iter_historic_bars",
            side_effect=requests.Timeout,
        ),
        pytest.raises(requests.Timeout),
    ):
        _load_historical_minutes(asset, start, start + timedelta(days=1))


def test_enqueue_failure_releases_backfill_marker():
    from apps.core.services.backfill_coordinator import request_backfill
    from main.cache_keys import cache_keys

    with (
        patch("apps.core.services.backfill_coordinator.cache.add", return_value=True),
        patch("apps.core.services.backfill_coordinator.cache.delete") as delete,
        patch(
            "apps.core.services.backfill_coordinator.fetch_historical_data.delay",
            side_effect=RuntimeError("broker unavailable"),
        ),
        pytest.raises(RuntimeError, match="broker unavailable"),
    ):
        request_backfill(1)
    delete.assert_called_once_with(cache_keys.backfill(1).queued())


@pytest.mark.django_db
def test_failed_history_does_not_mark_backfill_complete():
    from apps.core.models import Asset
    from apps.core.tasks import fetch_historical_data
    from main.cache_keys import cache_keys

    asset = Asset.objects.create(
        symbol="AAPL", alpaca_id="test-history", asset_class="us_equity"
    )
    with (
        patch("apps.core.tasks.cache.add", return_value=True),
        patch("apps.core.tasks.cache.delete") as delete,
        patch("apps.core.tasks.cache.set") as set_cache,
        patch("apps.core.tasks._load_historical_minutes", side_effect=requests.Timeout),
        pytest.raises(requests.Timeout),
    ):
        fetch_historical_data.run(asset.id)
    set_cache.assert_not_called()
    delete.assert_any_call(cache_keys.backfill(asset.id).completed())
    delete.assert_any_call(cache_keys.backfill(asset.id).running())


@pytest.mark.django_db
def test_failed_timeframe_rebuild_retains_existing_data():
    from apps.core.models import AggregatedCandle, Asset
    from apps.core.tasks import _rebuild_timeframes

    asset = Asset.objects.create(
        symbol="AAPL", alpaca_id="test-rebuild", asset_class="us_equity"
    )
    ts = datetime(2026, 10, 8, 14, 30, tzinfo=UTC)
    existing = AggregatedCandle.objects.create(
        asset=asset,
        timeframe="1H",
        timestamp=ts,
        open=100,
        high=100,
        low=100,
        close=100,
        volume=100,
    )
    with (
        patch(
            "apps.core.tasks.CandlePersistence.aggregate_to_timeframe",
            side_effect=RuntimeError("DB failure"),
        ),
        pytest.raises(RuntimeError),
    ):
        _rebuild_timeframes(asset, ts, ts + timedelta(days=1))
    assert AggregatedCandle.objects.filter(pk=existing.pk).exists()
