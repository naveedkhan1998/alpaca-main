import json
from queue import Queue
from unittest.mock import Mock, patch

from django.utils import timezone
import pytest

from apps.core.services.websocket.client import WebsocketClient


class TestWebsocketClient:
    """Test WebSocket client main functionality."""

    def setup_method(self):
        """Set up test client."""
        with (
            patch("apps.core.services.websocket.client.websocket.WebSocketApp"),
            patch("apps.core.services.websocket.client.threading.Thread"),
            patch.object(
                WebsocketClient, "_get_api_credentials", return_value=("key", "secret")
            ),
        ):

            self.client = WebsocketClient(sandbox=True)

    def test_initialization(self):
        """Test client initialization."""
        assert self.client.sandbox is True
        assert self.client.running is False
        assert self.client.authenticated is False
        assert isinstance(self.client.message_buffer, Queue)
        assert self.client.auth_timeout == 30

    def test_get_stocks_url_sandbox(self):
        """Test stocks URL generation for sandbox."""
        client = WebsocketClient(sandbox=True)
        url = client._get_stocks_url()
        assert "stream.data.sandbox.alpaca.markets" in url
        assert url.endswith("/v2/iex")

    def test_get_stocks_url_production(self):
        """Test stocks URL generation for production."""
        client = WebsocketClient(sandbox=False)
        url = client._get_stocks_url()
        assert "stream.data.alpaca.markets" in url
        assert url.endswith("/v2/iex")

    def test_get_crypto_url_sandbox(self):
        """Test crypto URL generation for sandbox."""
        client = WebsocketClient(sandbox=True)
        url = client._get_crypto_url()
        assert "stream.data.sandbox.alpaca.markets" in url
        assert url.endswith("/v1beta3/crypto/us")

    def test_get_crypto_url_production(self):
        """Test crypto URL generation for production."""
        client = WebsocketClient(sandbox=False)
        url = client._get_crypto_url()
        assert "stream.data.alpaca.markets" in url
        assert url.endswith("/v1beta3/crypto/us")

    @patch("apps.core.services.websocket.client.websocket.WebSocketApp")
    def test_connect_creates_websocket_apps(self, mock_ws_app):
        """Test that connect creates WebSocket app instances."""
        # Create client without calling _connect in __init__
        with patch.object(WebsocketClient, "_connect"):
            client = WebsocketClient(sandbox=True)

        client._connect()

        assert mock_ws_app.call_count == 2  # One for stocks, one for crypto
        calls = mock_ws_app.call_args_list

        # Check stocks WebSocket
        stocks_call = calls[0]
        assert stocks_call[1]["on_open"] == client.on_open
        assert stocks_call[1]["on_message"] == client.on_message_stocks
        assert stocks_call[1]["on_error"] == client.on_error
        assert stocks_call[1]["on_close"] == client.on_close

        # Check crypto WebSocket
        crypto_call = calls[1]
        assert crypto_call[1]["on_open"] == client.on_open
        assert crypto_call[1]["on_message"] == client.on_message_crypto
        assert crypto_call[1]["on_error"] == client.on_error
        assert crypto_call[1]["on_close"] == client.on_close

    def test_on_open_calls_authenticate(self):
        """Test on_open callback triggers authentication."""
        with patch.object(self.client, "_authenticate") as mock_auth:
            mock_ws = Mock()
            self.client.on_open(mock_ws)
            mock_auth.assert_called_once_with(mock_ws)

    def test_authenticate_sends_auth_payload(self):
        """Test authentication sends correct payload."""
        mock_ws = Mock()
        self.client.api_key = "test_key"
        self.client.secret_key = "test_secret"

        self.client._authenticate(mock_ws)

        mock_ws.send.assert_called_once_with(
            json.dumps({"action": "auth", "key": "test_key", "secret": "test_secret"})
        )
        assert self.client.auth_start_time is not None

    def test_on_message_stocks_error_authentication(self):
        """Test stocks error message handling for auth failures."""
        with patch.object(self.client, "stop") as mock_stop:
            msg = {"T": "error", "msg": "authentication failed"}
            self.client.on_message_stocks(None, json.dumps(msg))

            mock_stop.assert_called_once()

    def test_on_message_stocks_success_authenticated(self):
        """Test stocks success message for authentication."""
        with patch.object(self.client, "_update_subscriptions") as mock_update:
            msg = {"T": "success", "msg": "authenticated"}
            self.client.on_message_stocks(None, json.dumps(msg))

            assert self.client.authenticated is True
            mock_update.assert_called_once()

    def test_on_message_stocks_subscription(self):
        """Test stocks subscription message handling."""
        msg = {"T": "subscription", "data": ["AAPL", "GOOGL"]}
        # Should not raise exception
        self.client.on_message_stocks(None, json.dumps(msg))

    def test_on_message_stocks_trade_message(self):
        """Test stocks trade message buffering."""
        msg = {
            "T": "t",
            "S": "AAPL",
            "p": 150.25,
            "s": 100,
            "t": "2023-10-30T14:30:45.123456Z",
        }

        self.client.on_message_stocks(None, json.dumps(msg))

        assert not self.client.message_buffer.empty()
        buffered_msg = self.client.message_buffer.get()
        assert buffered_msg == msg

    def test_on_message_crypto_trade_message(self):
        """Test crypto trade message buffering."""
        msg = {
            "T": "t",
            "S": "BTC/USD",
            "p": 45000.50,
            "s": 0.5,
            "t": "2023-10-30T14:30:45.123456Z",
        }

        self.client.on_message_crypto(None, json.dumps(msg))

        assert not self.client.message_buffer.empty()
        buffered_msg = self.client.message_buffer.get()
        assert buffered_msg == msg

    def test_on_message_crypto_bar_message(self):
        """Test crypto bar message buffering."""
        msg = {
            "T": "b",
            "S": "BTC/USD",
            "o": 44900.0,
            "h": 45100.0,
            "l": 44800.0,
            "c": 45000.0,
            "v": 10.5,
            "t": "2023-10-30T14:30:00.000000Z",
        }

        self.client.on_message_crypto(None, json.dumps(msg))

        assert not self.client.message_buffer.empty()
        buffered_msg = self.client.message_buffer.get()
        assert buffered_msg == msg

    def test_on_message_invalid_json(self):
        """Test handling of invalid JSON messages."""
        with patch("apps.core.services.websocket.client.logger") as mock_logger:
            self.client.on_message_stocks(None, "invalid json")

            mock_logger.exception.assert_called_once()

    def test_on_error_logs_error(self):
        """Test error callback logging."""
        with patch("apps.core.services.websocket.client.logger") as mock_logger:
            error = Exception("Connection failed")
            self.client.on_error(None, error)

            mock_logger.error.assert_called_once_with("WS error: %s", error)

    def test_on_close_resets_state(self):
        """Test close callback resets authentication state."""
        self.client.authenticated = True
        self.client.auth_start_time = 1234567890.0

        self.client.on_close()

        assert self.client.authenticated is False
        assert self.client.auth_start_time is None

    def test_stop_sets_running_false(self):
        """Test stop method sets running flag."""
        self.client.running = True
        self.client.ws_stocks = Mock()
        self.client.ws_crypto = Mock()

        self.client.stop()

        assert self.client.running is False
        self.client.ws_stocks.close.assert_called_once()
        self.client.ws_crypto.close.assert_called_once()

    def test_sock_ready_stocks_connected(self):
        """Test stocks socket ready check when connected."""
        mock_sock = Mock()
        mock_sock.connected = True
        self.client.ws_stocks = Mock()
        self.client.ws_stocks.sock = mock_sock

        assert self.client._sock_ready_stocks() is True

    def test_sock_ready_stocks_not_connected(self):
        """Test stocks socket ready check when not connected."""
        self.client.ws_stocks = Mock()
        self.client.ws_stocks.sock = None

        assert self.client._sock_ready_stocks() is False

    def test_sock_ready_crypto_connected(self):
        """Test crypto socket ready check when connected."""
        mock_sock = Mock()
        mock_sock.connected = True
        self.client.ws_crypto = Mock()
        self.client.ws_crypto.sock = mock_sock

        assert self.client._sock_ready_crypto() is True

    def test_send_subscription_stocks_not_ready(self):
        """Test stocks subscription send when socket not ready."""
        with patch.object(self.client, "_sock_ready_stocks", return_value=False):
            self.client._send_subscription_stocks("subscribe", ["AAPL"])

            # Should not send if socket not ready
            if self.client.ws_stocks:
                self.client.ws_stocks.send.assert_not_called()

    def test_send_subscription_stocks_ready(self):
        """Test stocks subscription send when socket is ready."""
        mock_ws = Mock()
        self.client.ws_stocks = mock_ws
        self.client.authenticated = True

        with (
            patch.object(self.client, "_sock_ready_stocks", return_value=True),
            patch.object(self.client, "_sock_ready_crypto", return_value=True),
        ):

            self.client._send_subscription_stocks("subscribe", ["AAPL", "GOOGL"])

            mock_ws.send.assert_called_once_with(
                json.dumps({"action": "subscribe", "trades": ["AAPL", "GOOGL"]})
            )

    def test_send_subscription_crypto_ready(self):
        """Test crypto subscription send when socket is ready."""
        mock_ws = Mock()
        self.client.ws_crypto = mock_ws
        self.client.authenticated = True

        with (
            patch.object(self.client, "_sock_ready_stocks", return_value=True),
            patch.object(self.client, "_sock_ready_crypto", return_value=True),
        ):

            self.client._send_subscription_crypto("subscribe", ["BTC/USD"])

            mock_ws.send.assert_called_once_with(
                json.dumps(
                    {"action": "subscribe", "trades": ["BTC/USD"], "bars": ["BTC/USD"]}
                )
            )

    def test_send_subscription_empty_symbols(self):
        """Test subscription send with empty symbols list."""
        self.client._send_subscription_stocks("subscribe", [])

        # Should not attempt to send empty subscriptions
        if self.client.ws_stocks:
            self.client.ws_stocks.send.assert_not_called()

    def test_update_subscriptions_calls_reconcile(self):
        """Test update subscriptions calls subscription manager reconcile."""
        with patch.object(self.client.subscriptions, "reconcile") as mock_reconcile:
            self.client._update_subscriptions()
            mock_reconcile.assert_called_once()

    def test_on_assets_added_processes_assets(self):
        """Test asset addition callback processes assets correctly."""
        with (
            patch.object(self.client.subscriptions, "_asset_lock"),
            patch.object(
                self.client.backfill_guard,
                "maybe_schedule_for_assets",
                return_value={1},
            ),
            patch.object(self.client.aggregator, "reset_for_asset") as mock_reset,
        ):

            # Mock asset cache
            self.client.subscriptions.asset_cache = {"AAPL": 1}

            self.client._on_assets_added({"AAPL"})

            mock_reset.assert_called_once_with(1)

    @patch("apps.core.services.websocket.client.threading.Thread")
    @patch("time.sleep")
    def test_run_forever_basic_flow(self, mock_sleep, mock_thread):
        """Test basic run flow (without actual WebSocket connections)."""

        # Mock thread targets to avoid actual threading
        def mock_target():
            pass

        mock_thread_instance = Mock()
        mock_thread.return_value = mock_thread_instance

        with (
            patch.object(self.client, "_run_stocks", mock_target),
            patch.object(self.client, "_run_crypto", mock_target),
        ):

            self.client.running = True

            # Mock time.sleep to exit after first iteration
            def sleep_side_effect(secs):
                self.client.running = False

            mock_sleep.side_effect = sleep_side_effect

            self.client.run()

            assert self.client.running is False

    @pytest.mark.django_db
    def test_auth_timeout_checker_triggers_stop(self):
        """Test auth timeout checker stops client when timeout exceeded."""
        import time

        current_time = time.time()

        self.client.auth_start_time = current_time - 35  # Past timeout
        self.client.authenticated = False
        self.client.running = True  # Start running

        mock_stocks = Mock()
        mock_crypto = Mock()
        self.client.ws_stocks = mock_stocks
        self.client.ws_crypto = mock_crypto

        with (
            patch("time.time", return_value=current_time),
            patch("time.sleep") as mock_sleep,
        ):

            # Make sleep set running to False to exit loop
            def sleep_side_effect(secs):
                self.client.running = False

            mock_sleep.side_effect = sleep_side_effect

            self.client._auth_timeout_checker_loop()

            mock_stocks.close.assert_called_once()
            mock_crypto.close.assert_called_once()

    def test_auth_timeout_checker_resets_on_auth(self):
        """Test auth timeout checker resets when authenticated."""
        import time

        current_time = time.time()

        self.client.auth_start_time = current_time - 35
        self.client.authenticated = True
        self.client.running = False  # Exit loop

        with patch("time.time", return_value=current_time):
            self.client._auth_timeout_checker_loop()

            # Should not stop since authenticated
            assert self.client.auth_start_time == current_time - 35  # Unchanged

    @pytest.mark.django_db
    def test_subscription_manager_loop_basic(self):
        """Test subscription manager loop basic operation."""
        self.client.running = True  # Start running
        self.client.authenticated = True

        with (
            patch.object(self.client.subscriptions, "reconcile") as mock_reconcile,
            patch("time.sleep") as mock_sleep,
        ):

            # Make sleep set running to False to exit loop
            def sleep_side_effect(secs):
                self.client.running = False

            mock_sleep.side_effect = sleep_side_effect

            self.client._subscription_manager_loop()

            # Should call reconcile when authenticated
            mock_reconcile.assert_called_once()

    @pytest.mark.django_db
    def test_batch_processor_loop_processes_messages(self):
        """Test batch processor loop processes buffered messages."""
        # Add a message to buffer
        msg = {"T": "t", "S": "AAPL", "p": 150.0, "s": 100, "t": "2023-10-30T14:30:00Z"}
        self.client.message_buffer.put(msg)

        self.client.running = True  # Start running

        with (
            patch.object(self.client, "_process_batch") as mock_process,
            patch("time.sleep") as mock_sleep,
        ):

            # Make sleep set running to False to exit loop
            def sleep_side_effect(secs):
                self.client.running = False

            mock_sleep.side_effect = sleep_side_effect

            self.client._batch_processor_loop()

            mock_process.assert_called_once()
            called_messages = mock_process.call_args[0][0]
            assert len(called_messages) == 1
            assert called_messages[0] == msg

    def test_process_batch_empty(self):
        """Test processing empty batch."""
        self.client._process_batch([])

        # Should not raise exceptions
        assert True

    def test_process_batch_with_trades(self):
        """Test processing batch with trade messages."""
        ts_str = "2023-10-30T14:30:00.000000Z"
        messages = [{"T": "t", "S": "AAPL", "p": 150.25, "s": 100, "t": ts_str}]

        # Mock subscription caches
        with (
            patch.object(self.client.subscriptions, "_asset_lock"),
            patch.object(self.client.aggregator, "rollup_from_minutes") as mock_rollup,
            patch.object(self.client.aggregator, "persist_open") as _mock_persist_open,
            patch.object(self.client.aggregator, "flush_closed") as _mock_flush_closed,
            patch.object(self.client.repo, "upsert_minutes") as mock_upsert_minutes,
            patch(
                "apps.core.services.websocket.client.parse_tick_timestamp"
            ) as mock_parse,
            patch(
                "apps.core.services.websocket.client.is_regular_trading_hours",
                return_value=True,
            ),
        ):

            # Mock caches
            self.client.subscriptions.asset_cache = {"AAPL": 1}
            self.client.subscriptions.asset_class_cache = {1: "us_equity"}

            mock_rollup.return_value = {}
            mock_parse.return_value = timezone.now()

            self.client._process_batch(messages)

            # Should upsert 1T candles
            assert mock_upsert_minutes.call_count >= 1

    def test_schedule_backfill_for_asset(self):
        """Test backfill scheduling for asset."""
        with patch(
            "apps.core.services.backfill_coordinator.request_backfill"
        ) as mock_request:
            self.client._schedule_backfill_for_asset(123)

            mock_request.assert_called_once_with(123, source="websocket-service")

    def test_schedule_backfill_exception_handling(self):
        """Test backfill scheduling handles exceptions."""
        with (
            patch(
                "apps.core.services.backfill_coordinator.request_backfill",
                side_effect=Exception("Backfill failed"),
            ),
            patch("apps.core.services.websocket.client.logger") as mock_logger,
        ):

            self.client._schedule_backfill_for_asset(123)

            mock_logger.exception.assert_called_once()
