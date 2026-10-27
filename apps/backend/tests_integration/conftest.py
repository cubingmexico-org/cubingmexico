"""Runs backend jobs against a real Postgres migrated with packages/db's Drizzle migrations.

Uses its own `<name>_backend_test` database next to the web suite's TEST_DATABASE_URL,
so both suites can run at the same time.
"""

import json
import os
from pathlib import Path
from typing import LiteralString, cast
from urllib.parse import urlsplit, urlunsplit

import psycopg
import pytest
from psycopg import sql
from psycopg.rows import DictRow, dict_row

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
    conn = psycopg.connect(maintenance, autocommit=True)
    try:
        with conn.cursor() as cur:
            cur.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(DB_NAME)))
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
    finally:
        conn.close()


def _apply_migrations() -> None:
    journal = json.loads((MIGRATIONS_DIR / "meta" / "_journal.json").read_text())
    conn = psycopg.connect(DB_URL)
    try:
        with conn, conn.cursor() as cur:
            for entry in journal["entries"]:
                sql = (MIGRATIONS_DIR / f"{entry['tag']}.sql").read_text()
                for statement in sql.split("--> statement-breakpoint"):
                    if statement.strip():
                        # The repo's own Drizzle migrations, not user input.
                        cur.execute(cast(LiteralString, statement))
    finally:
        conn.close()


@pytest.fixture(scope="session", autouse=True)
def database():
    _recreate_database()
    _apply_migrations()
    yield
    if common._pool is not None:
        common._pool.close()
        common._pool = None


@pytest.fixture(autouse=True)
def clean_tables(database):
    if common._pool is not None:
        common._pool.close()
        common._pool = None
    conn = psycopg.connect(DB_URL)
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
            tables = [sql.Identifier("public", row[0]) for row in cur.fetchall()]
            if tables:
                cur.execute(sql.SQL("TRUNCATE {} RESTART IDENTITY CASCADE").format(sql.SQL(", ").join(tables)))
    finally:
        conn.close()


@pytest.fixture
def db(clean_tables):
    """Autocommit connection for seeding data and reading job output."""
    conn = psycopg.Connection[DictRow].connect(DB_URL, autocommit=True, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture
def client(clean_tables):
    app = create_app()
    app.config.update(TESTING=True)
    return app.test_client()
