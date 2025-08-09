from apps.core.services.websocket.connection import AlpacaWSConnection


class DummyWS:
    def __init__(self):
        self.sent = []
        self.sock = type("Sock", (), {"connected": True})()

    def send(self, payload):
        self.sent.append(payload)


def test_connect_and_send(monkeypatch):
    dummy = DummyWS()
    conn = AlpacaWSConnection(
        url="wss://test",
        api_key="key",
        secret_key="secret",
        on_open=lambda ws: None,
        on_message=lambda ws, msg: None,
        on_error=lambda ws, err: None,
        on_close=lambda ws, code, msg: None,
    )
    # Patch WebSocketApp to just store our dummy
    monkeypatch.setattr(
        "apps.core.services.websocket.connection.websocket.WebSocketApp",
        lambda *a, **k: dummy,
    )
    conn.connect()
    assert isinstance(conn.ws_app, DummyWS)

    conn.send("hello")
    assert dummy.sent == ["hello"]
