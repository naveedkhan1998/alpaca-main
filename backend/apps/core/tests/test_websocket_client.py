import json

import pytest

from apps.core.services.websocket.client import WebsocketClient


class DummyWS:
    def __init__(self):
        self.sent = []
        self.sock = type("Sock", (), {"connected": True})()

    def send(self, payload):
        self.sent.append(payload)


@pytest.fixture
def client(monkeypatch):
    # Patch DB call for credentials
    monkeypatch.setattr(
        "apps.core.services.websocket.client.AlpacaAccount.objects.get",
        lambda id: type("Acct", (), {"api_key": "key", "api_secret": "secret"})(),
    )
    c = WebsocketClient(account_id=1, sandbox=True)
    c.connection.ws_app = DummyWS()
    return c


def test_on_message_auth(client):
    msg = json.dumps({"T": "success", "msg": "authenticated"})
    client._on_message(None, msg)
    assert client.authenticated is True


def test_on_message_tick(client):
    tick = {"T": "t", "S": "AAPL", "p": 150, "s": 10, "t": "2025-08-08T14:30:00+00:00"}
    client._on_message(None, json.dumps(tick))
    assert not client.tick_buffer.empty()


def test_send_subscribe(client):
    client._send_subscribe(["AAPL"])
    assert json.loads(client.connection.ws_app.sent[0])["trades"] == ["AAPL"]


def test_drain_ticks(client):
    client.tick_buffer.put({"T": "t"})
    ticks = client._drain_ticks()
    assert ticks == [{"T": "t"}]
