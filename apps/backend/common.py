import hmac
import logging
import os
import threading
from collections.abc import Sequence
from contextlib import contextmanager
from functools import wraps
from typing import Any, LiteralString, cast

import psycopg
from flask import abort, jsonify, request
from google.cloud import secretmanager
from psycopg.rows import RowFactory, namedtuple_row
from psycopg_pool import ConnectionPool, PoolTimeout

# Mirrors the WCA's `Event.official` scope: ranks 800-989 are announced but
# not yet official (e.g. fto), 990-999 are deprecated (333ft, magic, ...).
OFFICIAL_EVENT_MAX_RANK = 800
# Built only from the int constants above, so safe to interpolate into SQL.
OFFICIAL_EVENTS_SUBQUERY = cast(LiteralString, f"(SELECT id FROM events WHERE rank < {OFFICIAL_EVENT_MAX_RANK})")
DEPRECATED_EVENT_MIN_RANK = 990
DEPRECATED_EVENT_MAX_RANK = 999
WITH_DEPRECATED_EVENTS_SUBQUERY = cast(
    LiteralString,
    f"(SELECT id FROM events WHERE rank < {OFFICIAL_EVENT_MAX_RANK}"
    f" OR rank BETWEEN {DEPRECATED_EVENT_MIN_RANK} AND {DEPRECATED_EVENT_MAX_RANK})",
)
# Derived tables store one variant per scope; "all" adds deprecated events (never fto).
EVENT_SCOPES = ("official", "all")


def events_subquery(scope: str) -> LiteralString:
    return WITH_DEPRECATED_EVENTS_SUBQUERY if scope == "all" else OFFICIAL_EVENTS_SUBQUERY


SINGLE_EVENTS = ["333fm", "333bf", "333mbf", "444bf", "555bf"]
# Old-style multi-blind has no comparable national record, so Kinch skips it.
KINCH_SKIPPED_EVENTS = ["333mbo"]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


def get_secret(secret_id, project_id, version_id="latest"):
    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        log.warning("Could not fetch secret '%s' from Secret Manager: %s", secret_id, e)
        return None


GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "cubing-mexico")
IS_DEV = os.environ.get("FLASK_ENV") == "development"

LOCAL_DEV_DB_URL = "postgresql://postgres:postgres@localhost:5432/cubing_mexico"
LOCAL_DEV_CRON_SECRET = "local-dev-cron-secret-12345"


def _resolve_required(env_key: str, secret_id: str, dev_default: str) -> str:
    """Env var, then Secret Manager; the hard-coded default is only allowed when FLASK_ENV=development."""
    value = os.environ.get(env_key)
    if value:
        log.info("Using %s from environment variable", env_key)
        return value
    log.info("%s not found in environment, fetching from Secret Manager", env_key)
    value = get_secret(secret_id, GCP_PROJECT_ID)
    if value:
        return value
    if IS_DEV:
        log.info("Defaulting %s to local development value", env_key)
        return dev_default
    raise RuntimeError(
        f"{env_key} is not configured (env var or Secret Manager '{secret_id}'). "
        "Set FLASK_ENV=development to use local defaults."
    )


DB_URL = _resolve_required("DB_URL", "db_url", LOCAL_DEV_DB_URL)
CRON_SECRET = _resolve_required("CRON_SECRET", "cron-secret", LOCAL_DEV_CRON_SECRET)


def _env_or_secret(env_key: str, secret_id: str | None = None) -> str | None:
    value = os.environ.get(env_key)
    if value:
        return value
    if secret_id:
        return get_secret(secret_id, GCP_PROJECT_ID)
    return None


SOCIAL_POSTS_ENABLED = os.environ.get("SOCIAL_POSTS_ENABLED", "").lower() in (
    "1",
    "true",
    "yes",
)

PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/") or None

# Cloud Run Job resource name (projects/P/locations/R/jobs/J). When set, `/update-all` starts an
# execution of it and returns right away; when unset (local dev, tests) it runs in the request.
UPDATE_ALL_JOB = os.environ.get("UPDATE_ALL_JOB") or None

# Public origin of the web app, used to revalidate its caches after data jobs.
WEB_URL = os.environ.get("WEB_URL", "").rstrip("/") or None

# Meta credentials are resolved lazily so local boot does not block on Secret Manager.
_UNSET = object()
_meta_page_access_token = _UNSET
_facebook_page_id = _UNSET
_instagram_business_account_id = _UNSET


def get_meta_page_access_token() -> str | None:
    global _meta_page_access_token
    if _meta_page_access_token is _UNSET:
        _meta_page_access_token = _env_or_secret("META_PAGE_ACCESS_TOKEN", "meta-page-access-token")
    return _meta_page_access_token  # type: ignore[return-value]


def get_facebook_page_id() -> str | None:
    global _facebook_page_id
    if _facebook_page_id is _UNSET:
        _facebook_page_id = _env_or_secret("FACEBOOK_PAGE_ID", "facebook-page-id")
    return _facebook_page_id  # type: ignore[return-value]


def get_instagram_business_account_id() -> str | None:
    global _instagram_business_account_id
    if _instagram_business_account_id is _UNSET:
        _instagram_business_account_id = _env_or_secret(
            "INSTAGRAM_BUSINESS_ACCOUNT_ID", "instagram-business-account-id"
        )
    return _instagram_business_account_id  # type: ignore[return-value]


# A worker can't use more connections at once than it has threads.
GUNICORN_THREADS = max(1, int(os.environ.get("GUNICORN_THREADS", "8")))
WEB_CONCURRENCY = max(1, int(os.environ.get("WEB_CONCURRENCY", "1")))
DB_POOL_MAX = max(1, int(os.environ.get("DB_POOL_MAX", str(GUNICORN_THREADS))))
log.info(
    "DB pool: up to %s connections per worker, %s across %s worker(s)",
    DB_POOL_MAX,
    DB_POOL_MAX * WEB_CONCURRENCY,
    WEB_CONCURRENCY,
)
# How long a request waits for a free pooled connection before opening a one-off one.
DB_POOL_CHECKOUT_TIMEOUT = 2.0
# Production connects through Neon's pooler (PgBouncer in transaction mode), which can't
# keep the server-side prepared statements psycopg creates for repeated queries.
DB_CONNECT_KWARGS: dict[str, Any] = {"prepare_threshold": None}

_pool: ConnectionPool | None = None
_pool_lock = threading.Lock()


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                # Opened lazily so each gunicorn worker starts its pool threads after forking.
                _pool = ConnectionPool(
                    DB_URL,
                    min_size=1,
                    max_size=DB_POOL_MAX,
                    kwargs=DB_CONNECT_KWARGS,
                    check=ConnectionPool.check_connection,
                    open=True,
                )
    return _pool


# psycopg's `namedtuple_row`, with rows typed `Any`: psycopg types them as a bare NamedTuple,
# so a type checker can't see the columns either way.
named_row = cast(RowFactory[Any], namedtuple_row)


def connect() -> psycopg.Connection:
    """A new, unpooled connection with the same settings as the pool's."""
    return psycopg.connect(DB_URL, **DB_CONNECT_KWARGS)


def _checkout() -> tuple[psycopg.Connection, bool]:
    """Returns (conn, pooled). Falls back to a one-off connection when the pool is exhausted."""
    pool = _get_pool()
    try:
        return pool.getconn(timeout=DB_POOL_CHECKOUT_TIMEOUT), True
    except PoolTimeout:
        log.warning("DB pool exhausted (max %s); opening a one-off connection", DB_POOL_MAX)
        return connect(), False


@contextmanager
def get_connection():
    """Yields a pooled connection; commits on success, rolls back on error."""
    conn, pooled = _checkout()
    try:
        yield conn
        conn.commit()
    except BaseException:
        if not conn.closed:
            try:
                conn.rollback()
            except psycopg.Error:
                log.warning("Rollback failed; discarding connection", exc_info=True)
                conn.close()
        raise
    finally:
        if pooled:
            _get_pool().putconn(conn)
        else:
            conn.close()


@contextmanager
def cursor():
    """Yields a named-tuple cursor on a pooled connection, with `get_connection()`'s commit/rollback."""
    with get_connection() as conn, conn.cursor(row_factory=named_row) as cur:
        yield cur


def execute_values(
    cur: psycopg.Cursor,
    sql: LiteralString,
    rows: Sequence[Sequence[Any]],
    template: LiteralString | None = None,
    page_size: int = 100,
) -> None:
    """Runs `sql` with its single `VALUES %s` expanded to one row tuple per row, `page_size` rows at a time.

    Like psycopg2's `execute_values`: each page is one multi-row statement, so `ON CONFLICT` behaves the same.
    """
    if "VALUES %s" not in sql:
        raise ValueError("execute_values needs a single 'VALUES %s' placeholder")
    for start in range(0, len(rows), page_size):
        page = rows[start : start + page_size]
        row_template = template or "(" + ", ".join(["%s"] * len(page[0])) + ")"
        values = ", ".join([row_template] * len(page))
        query = sql.replace("VALUES %s", f"VALUES {values}", 1)
        cur.execute(cast(LiteralString, query), [value for row in page for value in row])


def job_response(fn, error_message):
    """Runs a job that returns a dict (or None) and raises on failure, as a JSON response."""
    try:
        result = fn() or {}
    except Exception:
        log.exception(error_message)
        return jsonify({"success": False, "message": error_message}), 500
    return jsonify({"success": True, **result})


def require_cron_auth(f):
    """Decorator to restrict endpoints to authorized cron jobs only."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            log.warning("Missing Authorization header for %s", request.path)
            abort(401, description="Unauthorized: Missing authorization")

        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid scheme")
        except ValueError:
            log.warning("Invalid Authorization header format for %s", request.path)
            abort(401, description="Unauthorized: Invalid authorization format")

        if not hmac.compare_digest(token.encode(), CRON_SECRET.encode()):
            log.warning("Invalid cron token for %s", request.path)
            abort(403, description="Access forbidden: Invalid credentials")

        return f(*args, **kwargs)

    return decorated_function
