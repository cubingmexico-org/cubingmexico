import logging
import os
from functools import wraps

import psycopg2
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

# For local development, allow DB_URL to be set via environment variable.
# Otherwise, fetch from GCP Secret Manager.
DB_URL = os.environ.get("DB_URL")
if not DB_URL:
    log.info("DB_URL not found in environment, fetching from Secret Manager")
    DB_URL = get_secret("db_url", GCP_PROJECT_ID)
    if not DB_URL:
        DB_URL = "postgresql://postgres:postgres@localhost:5432/cubing_mexico"
        log.info("Defaulting DB_URL to local PostgreSQL: %s", DB_URL)
else:
    log.info("Using DB_URL from environment variable")


CRON_SECRET = os.environ.get("CRON_SECRET")
if not CRON_SECRET:
    log.info("CRON_SECRET not found in environment, fetching from Secret Manager")
    CRON_SECRET = get_secret("cron-secret", GCP_PROJECT_ID)
    if not CRON_SECRET:
        CRON_SECRET = "local-dev-cron-secret-12345"
        log.info("Defaulting CRON_SECRET to local development token")
else:
    log.info("Using CRON_SECRET from environment variable")


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
        _meta_page_access_token = _env_or_secret(
            "META_PAGE_ACCESS_TOKEN", "meta-page-access-token"
        )
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


def get_connection():
    return psycopg2.connect(DB_URL)


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

        if token != CRON_SECRET:
            log.warning("Invalid cron token for %s", request.path)
            abort(403, description="Access forbidden: Invalid credentials")

        return f(*args, **kwargs)

    return decorated_function
