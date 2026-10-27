import pytest
import sentry_sdk
from sentry_sdk.transport import Transport

import sentry_setup
from app import create_app


class CapturingTransport(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.events = []

    def capture_envelope(self, envelope):
        event = envelope.get_event()
        if event is not None:
            self.events.append(event)


@pytest.fixture
def sentry_events(monkeypatch):
    """Turns Sentry on with a transport that keeps events in memory instead of sending them."""
    transport = CapturingTransport()
    real_init = sentry_sdk.init
    monkeypatch.setenv("SENTRY_DSN", "https://public@sentry.example/1")
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "test")
    monkeypatch.setattr(sentry_setup.sentry_sdk, "init", lambda **kwargs: real_init(**kwargs, transport=transport))
    yield transport.events
    sentry_sdk.get_client().close()
    # init() reads SENTRY_DSN, so drop it before resetting to a disabled client.
    monkeypatch.delenv("SENTRY_DSN")
    real_init()


def test_stays_off_without_a_dsn(monkeypatch):
    calls = []
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    monkeypatch.setattr(sentry_setup.sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))

    assert sentry_setup.init_sentry() is False
    assert calls == []


def test_keeps_personal_data_out(monkeypatch):
    calls = []
    monkeypatch.setenv("SENTRY_DSN", "https://public@sentry.example/1")
    monkeypatch.setenv("SENTRY_ENVIRONMENT", "staging")
    monkeypatch.setattr(sentry_setup.sentry_sdk, "is_initialized", lambda: False)
    monkeypatch.setattr(sentry_setup.sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))

    assert sentry_setup.init_sentry() is True
    [options] = calls
    assert options["environment"] == "staging"
    assert options["traces_sample_rate"] == 0.0
    assert options["data_collection"] == {
        "user_info": False,
        "cookies": {"mode": "off"},
        "http_bodies": [],
        "database_query_data": False,
        "stack_frame_variables": False,
    }


def test_reports_unhandled_route_errors_once(sentry_events):
    app = create_app()

    @app.route("/__boom")
    def boom():
        raise RuntimeError("kaboom")

    resp = app.test_client().get("/__boom")
    sentry_sdk.flush()

    assert resp.status_code == 500
    [event] = sentry_events
    assert event["environment"] == "test"
    [exception] = event["exception"]["values"]
    assert exception["type"] == "RuntimeError"
    assert exception["value"] == "kaboom"
    assert all("vars" not in frame for frame in exception["stacktrace"]["frames"])


def test_http_errors_are_not_reported(sentry_events):
    app = create_app()

    resp = app.test_client().get("/__does-not-exist")
    sentry_sdk.flush()

    assert resp.status_code == 404
    assert sentry_events == []
