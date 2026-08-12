"""Short-lived filesystem store for Instagram image_url hosting.

Uses /tmp so all Gunicorn workers can serve the same media token.
"""

from __future__ import annotations

import secrets
import time
from pathlib import Path

TTL_SECONDS = 10 * 60
MEDIA_DIR = Path("/tmp/cubingmexico-social-media")


def _ensure_dir() -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _meta_path(token: str) -> Path:
    return MEDIA_DIR / f"{token}.meta"


def _data_path(token: str) -> Path:
    return MEDIA_DIR / f"{token}.bin"


def _purge_expired(now: float | None = None) -> None:
    now = time.time() if now is None else now
    if not MEDIA_DIR.exists():
        return
    for meta in MEDIA_DIR.glob("*.meta"):
        try:
            expires_at = float(meta.read_text().split("\n", 1)[0])
        except (OSError, ValueError):
            expires_at = 0
        if expires_at <= now:
            token = meta.stem
            meta.unlink(missing_ok=True)
            _data_path(token).unlink(missing_ok=True)


def put_media(data: bytes, content_type: str = "image/png", ttl_seconds: int = TTL_SECONDS) -> str:
    _ensure_dir()
    _purge_expired()
    token = secrets.token_urlsafe(24)
    _data_path(token).write_bytes(data)
    _meta_path(token).write_text(f"{time.time() + ttl_seconds}\n{content_type}\n")
    return token


def get_media(token: str) -> tuple[bytes, str] | None:
    _purge_expired()
    meta = _meta_path(token)
    data_file = _data_path(token)
    if not meta.exists() or not data_file.exists():
        return None
    try:
        expires_line, content_type, *_ = meta.read_text().split("\n")
        expires_at = float(expires_line)
    except (OSError, ValueError):
        return None
    if expires_at <= time.time():
        delete_media(token)
        return None
    return data_file.read_bytes(), content_type or "image/png"


def delete_media(token: str) -> None:
    _meta_path(token).unlink(missing_ok=True)
    _data_path(token).unlink(missing_ok=True)
