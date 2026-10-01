"""RESUMEN posts: yearly summaries unlocked."""

from __future__ import annotations

from datetime import datetime, timezone

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.poster.shared import (
    CURRENT_YEAR_SUMMARY_UNLOCK_DAY,
    POST_TYPE_SUMMARY_UNLOCK,
    _already_posted,
    _publish_image_to_platforms,
)
from social.summary_unlock_image import generate_summary_unlock_png


def is_summary_year_published(year: int, now: datetime | None = None) -> bool:
    """Past years always published; current year from Dec 20 UTC onward."""
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    else:
        now = now.astimezone(timezone.utc)

    current_year = now.year
    if year < current_year:
        return True
    if year > current_year:
        return False
    return now.month == 12 and now.day >= CURRENT_YEAR_SUMMARY_UNLOCK_DAY


def summary_unlock_year_if_due(now: datetime | None = None) -> int | None:
    """Return the current calendar year if its summary unlock window is open."""
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    else:
        now = now.astimezone(timezone.utc)

    year = now.year
    if is_summary_year_published(year, now):
        return year
    return None


def parse_summary_unlock_year(raw: str | int) -> int | None:
    try:
        year = int(raw)
    except (TypeError, ValueError):
        return None
    if year < 2000 or year > 2100:
        return None
    return year


def build_summary_unlock_caption(
    *,
    year: int,
    include_link: bool = True,
) -> str:
    parts = [
        f"¡Ya están disponibles los resúmenes anuales {year}!",
        "",
        "Consulta tu resumen personal y el de tu team en Cubing México (inicia sesión y ábrelo desde tu menú).",
    ]
    if include_link:
        parts.append("")
        parts.append("https://cubingmexico.net")
    parts.append("")
    parts.append("#CubingMéxico #ResumenAnual #Speedcubing")
    return "\n".join(parts)


def get_summary_unlock_captions(year: int) -> dict[str, str]:
    return {
        "facebook": build_summary_unlock_caption(year=year, include_link=True),
        "instagram": build_summary_unlock_caption(year=year, include_link=False),
    }


def generate_summary_unlock_png_for_year(year: int) -> bytes:
    return generate_summary_unlock_png(year=year)


def post_summary_unlock(year: int) -> dict:
    subject_key = str(year)
    result = {
        "post_type": POST_TYPE_SUMMARY_UNLOCK,
        "subject_key": subject_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    if not is_summary_year_published(year):
        result["errors"].append("summary_year_not_unlocked")
        return result

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            skip_fb = _already_posted(cur, POST_TYPE_SUMMARY_UNLOCK, subject_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_SUMMARY_UNLOCK, subject_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping SUMMARY_UNLOCK %s — already posted", year)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    png = generate_summary_unlock_png(year=year)
    captions = get_summary_unlock_captions(year)
    return _publish_image_to_platforms(
        post_type=POST_TYPE_SUMMARY_UNLOCK,
        subject_key=subject_key,
        competition_id=None,
        png=png,
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_summary_unlock_if_due() -> dict | None:
    """Auto-post current-year summary unlock when Dec 20+ UTC and not yet posted."""
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping summary unlock.")
        return None

    year = summary_unlock_year_if_due()
    if year is None:
        log.info("Summary unlock not due yet (before Dec %s UTC).", CURRENT_YEAR_SUMMARY_UNLOCK_DAY)
        return None

    try:
        result = post_summary_unlock(year)
        log.info("Summary unlock post for %s: %s", year, result)
        return result
    except Exception as e:
        log.exception("Unhandled error posting SUMMARY_UNLOCK %s: %s", year, e)
        return {
            "post_type": POST_TYPE_SUMMARY_UNLOCK,
            "subject_key": str(year),
            "competition_id": None,
            "facebook": None,
            "instagram": None,
            "errors": [str(e)],
        }
