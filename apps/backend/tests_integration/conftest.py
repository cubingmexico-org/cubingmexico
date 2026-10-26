"""Runs backend jobs against a real Postgres migrated with packages/db's Drizzle migrations.

Uses its own `<name>_backend_test` database next to the web suite's TEST_DATABASE_URL,
so both suites can run at the same time.
"""

import json
import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg2
import psycopg2.extras
import pytest

DEFAULT_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cubing_mexico_test"
MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "packages" / "db" / "drizzle"


def _backend_test_database() -> tuple[str, str]:
    url = urlsplit(os.environ.get("TEST_DATABASE_URL") or DEFAULT_TEST_DATABASE_URL)
    name = url.path.lstrip("/")
    if not name.endswith("_test"):
        raise RuntimeError(
            f'Refusing to run integration tests against "{name}": the database name must end with "_test".'
        )
    backend_name = f"{name.removesuffix('_test')}_backend_test"
    return urlunsplit(url._replace(path=f"/{backend_name}")), backend_name


DB_URL, DB_NAME = _backend_test_database()

# common reads these at import time.
os.environ["DB_URL"] = DB_URL
os.environ["FLASK_ENV"] = "development"
os.environ["CRON_SECRET"] = "test-secret"
os.environ["SOCIAL_POSTS_ENABLED"] = "false"
os.environ["SKIP_GEOCODING"] = "true"

import common  # noqa: E402
from app import create_app  # noqa: E402


def _recreate_database() -> None:
    maintenance = urlunsplit(urlsplit(DB_URL)._replace(path="/postgres"))
    conn = psycopg2.connect(maintenance)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(f'DROP DATABASE IF EXISTS "{DB_NAME}" WITH (FORCE)')
            cur.execute(f'CREATE DATABASE "{DB_NAME}"')
    finally:
        conn.close()


def _apply_migrations() -> None:
    journal = json.loads((MIGRATIONS_DIR / "meta" / "_journal.json").read_text())
    conn = psycopg2.connect(DB_URL)
    try:
        with conn, conn.cursor() as cur:
            for entry in journal["entries"]:
                sql = (MIGRATIONS_DIR / f"{entry['tag']}.sql").read_text()
                for statement in sql.split("--> statement-breakpoint"):
                    if statement.strip():
                        cur.execute(statement)
    finally:
        conn.close()


@pytest.fixture(scope="session", autouse=True)
def database():
    _recreate_database()
    _apply_migrations()
    yield
    if common._pool is not None:
        common._pool.closeall()
        common._pool = None


@pytest.fixture(autouse=True)
def clean_tables(database):
    if common._pool is not None:
        common._pool.closeall()
        common._pool = None
    conn = psycopg2.connect(DB_URL)
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            tables = ", ".join(f'"public"."{row[0]}"' for row in cur.fetchall())
            if tables:
                cur.execute(f"TRUNCATE {tables} RESTART IDENTITY CASCADE")
    finally:
        conn.close()


@pytest.fixture
def db(clean_tables):
    """Autocommit connection for seeding data and reading job output."""
    conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = True
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture
def client(clean_tables):
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()
