import importlib

import pytest

import common

PROTECTED_URL = "/social/summary-unlock/2025/caption"


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "test-secret"},
        {"Authorization": "Basic test-secret"},
        {"Authorization": "Bearer"},
        {"Authorization": "Bearer wrong-secret"},
        {"Authorization": "Bearer test-secret extra"},
    ],
)
def test_rejects_missing_or_invalid_token(client, headers):
    assert client.get(PROTECTED_URL, headers=headers).status_code == 403


def test_accepts_valid_token(client):
    assert client.get(PROTECTED_URL, headers={"Authorization": "Bearer test-secret"}).status_code != 403


def test_accepts_lowercase_scheme(client):
    assert client.get(PROTECTED_URL, headers={"Authorization": "bearer test-secret"}).status_code != 403


def _no_secret_manager():
    raise RuntimeError("Secret Manager is unavailable in tests")


@pytest.fixture
def reload_common(monkeypatch):
    def _reload(env):
        for key in ("FLASK_ENV", "DB_URL", "CRON_SECRET"):
            monkeypatch.delenv(key, raising=False)
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        monkeypatch.setattr("google.cloud.secretmanager.SecretManagerServiceClient", _no_secret_manager)
        return importlib.reload(common)

    yield _reload
    monkeypatch.undo()
    importlib.reload(common)


def test_refuses_to_start_without_secrets_outside_dev(reload_common):
    with pytest.raises(RuntimeError, match="DB_URL"):
        reload_common({})


def test_refuses_to_start_without_cron_secret_outside_dev(reload_common):
    with pytest.raises(RuntimeError, match="CRON_SECRET"):
        reload_common({"DB_URL": "postgresql://x@localhost/x"})


def test_dev_falls_back_to_local_defaults(reload_common):
    module = reload_common({"FLASK_ENV": "development"})
    assert module.DB_URL == module.LOCAL_DEV_DB_URL
    assert module.CRON_SECRET == module.LOCAL_DEV_CRON_SECRET


def test_env_values_win(reload_common):
    module = reload_common({"DB_URL": "postgresql://env@localhost/env", "CRON_SECRET": "from-env"})
    assert module.DB_URL == "postgresql://env@localhost/env"
    assert module.CRON_SECRET == "from-env"
