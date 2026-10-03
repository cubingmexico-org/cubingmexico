import os

os.environ["FLASK_ENV"] = "development"
os.environ["CRON_SECRET"] = "test-secret"
os.environ["DB_URL"] = "postgresql://test:test@localhost:1/test"
os.environ.setdefault("SOCIAL_POSTS_ENABLED", "false")

import pytest  # noqa: E402

from app import create_app  # noqa: E402

AUTH_HEADERS = {"Authorization": "Bearer test-secret"}


@pytest.fixture
def app():
    flask_app = create_app()
    flask_app.config.update(TESTING=True)
    return flask_app


@pytest.fixture
def client(app):
    return app.test_client()
