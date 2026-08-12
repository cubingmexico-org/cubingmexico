"""Short-lived Postgres store for Instagram image_url hosting.

Cloud Run may route Meta's GET to a different instance than the publish
request, so /tmp is not shared across replicas.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from psycopg2 import Binary

from common import get_connection

TTL_SECONDS = 10 * 60

_ENSURED = False

_ENSURE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS social_temp_media (
    token TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    data BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
)
"""

_ENSURE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS social_temp_media_expires_idx
    ON social_temp_media (expires_at)
"""


def _ensure_table(cur) -> None:
    global _ENSURED
    if _ENSURED:
        return
    cur.execute(_ENSURE_TABLE_SQL)
    cur.execute(_ENSURE_INDEX_SQL)
    _ENSURED = True


def _purge_expired(cur, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    cur.execute("DELETE FROM social_temp_media WHERE expires_at <= %s", (now,))


def put_media(
    data: bytes,
    content_type: str = "image/jpeg",
    ttl_seconds: int = TTL_SECONDS,
) -> str:
    token = secrets.token_urlsafe(24)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            _purge_expired(cur)
            cur.execute(
                """
                INSERT INTO social_temp_media (token, content_type, data, expires_at)
                VALUES (%s, %s, %s, %s)
                """,
                (token, content_type, Binary(data), expires_at),
            )
        conn.commit()
    return token


def get_media(token: str) -> tuple[bytes, str] | None:
    now = datetime.now(timezone.utc)
    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            _purge_expired(cur, now)
            cur.execute(
                """
                SELECT data, content_type
                FROM social_temp_media
                WHERE token = %s AND expires_at > %s
                """,
                (token, now),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        return None
    data, content_type = row
    if isinstance(data, memoryview):
        data = data.tobytes()
    return bytes(data), content_type or "image/jpeg"


def delete_media(token: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            cur.execute("DELETE FROM social_temp_media WHERE token = %s", (token,))
        conn.commit()
