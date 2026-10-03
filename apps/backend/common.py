import hmac
import logging
import os
import threading
from contextlib import contextmanager
from functools import wraps

import psycopg2
import psycopg2.pool
from flask import abort, request
from google.cloud import secretmanager

EXCLUDED_EVENTS = ["333ft", "333mbo", "magic", "mmagic", "fto"]
SINGLE_EVENTS = ["333fm", "333bf", "333mbf", "444bf", "555bf"]

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


DB_POOL_MAX = max(1, int(os.environ.get("DB_POOL_MAX", "10")))
_pool: psycopg2.pool.ThreadedConnectionPool | None = None
_pool_lock = threading.Lock()


def _get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = psycopg2.pool.ThreadedConnectionPool(1, DB_POOL_MAX, DB_URL)
    return _pool


def _checkout():
    """Returns (conn, pooled). Falls back to a one-off connection when the pool is exhausted."""
    pool = _get_pool()
    try:
        conn = pool.getconn()
    except psycopg2.pool.PoolError:
        log.warning("DB pool exhausted (max %s); opening a one-off connection", DB_POOL_MAX)
        return psycopg2.connect(DB_URL), False
    if conn.closed:
        pool.putconn(conn, close=True)
        conn = pool.getconn()
    return conn, True


@contextmanager
def get_connection():
    """Yields a pooled connection; commits on success, rolls back on error (same as `with psycopg2.connect()`)."""
    conn, pooled = _checkout()
    try:
        yield conn
        conn.commit()
    except BaseException:
        if not conn.closed:
            try:
                conn.rollback()
            except psycopg2.Error:
                log.warning("Rollback failed; discarding connection", exc_info=True)
                conn.close()
        raise
    finally:
        if pooled:
            _get_pool().putconn(conn, close=bool(conn.closed))
        else:
            conn.close()


def require_cron_auth(f):
    """Decorator to restrict endpoints to authorized cron jobs only."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            log.warning("Missing Authorization header for %s", request.path)
            abort(403, description="Access forbidden: Missing authorization")

        try:
            scheme, token = auth_header.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid scheme")
        except ValueError:
            log.warning("Invalid Authorization header format for %s", request.path)
            abort(403, description="Access forbidden: Invalid authorization format")

        if not hmac.compare_digest(token.encode(), CRON_SECRET.encode()):
            log.warning("Invalid cron token for %s", request.path)
            abort(403, description="Access forbidden: Invalid credentials")

        return f(*args, **kwargs)

    return decorated_function
