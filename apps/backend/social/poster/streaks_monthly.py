"""RACHAS posts: monthly PR streak leaderboard."""

from __future__ import annotations

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.calendar_mx import is_streaks_monthly_due, parse_month_key, streaks_monthly_key_if_due
from social.digest_queries import fetch_streaks_monthly_payload
from social.poster.shared import POST_TYPE_STREAKS_MONTHLY, _already_posted, _publish_image_to_platforms
from social.streaks_monthly_image import generate_streaks_monthly_png


def get_streaks_monthly_payload(month_key: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            return fetch_streaks_monthly_payload(cur, month_key)


def build_streaks_monthly_caption(payload: dict, *, include_link: bool = True) -> str:
    month_label = payload.get("month_label") or payload.get("month_key")
    parts: list[str] = [
        f"Rachas de récords personales — {month_label}.",
        "",
        "Top rachas actuales (competencias consecutivas con al menos un PR):",
    ]
    for i, row in enumerate(payload.get("top_current") or [], start=1):
        state = (row.get("state_name") or "").strip()
        who = f"{row['person_name']}" + (f" ({state})" if state else "")
        parts.append(f"{i}. {who} — {row['current_streak']}")

    if include_link:
        parts.append("")
        parts.append("https://cubingmexico.net/streaks")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing #Rachas")
    return "\n".join(parts)


def get_streaks_monthly_captions(month_key: str) -> dict[str, str] | None:
    payload = get_streaks_monthly_payload(month_key)
    if not payload:
        return None
    return {
        "facebook": build_streaks_monthly_caption(payload, include_link=True),
        "instagram": build_streaks_monthly_caption(payload, include_link=False),
    }


def generate_streaks_monthly_png_for_month(
    month_key: str,
) -> tuple[bytes, dict] | None:
    payload = get_streaks_monthly_payload(month_key)
    if not payload:
        return None
    return generate_streaks_monthly_png(payload=payload), payload


def post_streaks_monthly(month_key: str) -> dict:
    result = {
        "post_type": POST_TYPE_STREAKS_MONTHLY,
        "subject_key": month_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    if parse_month_key(month_key) is None:
        result["errors"].append("invalid_month")
        return result
    if not is_streaks_monthly_due(month_key):
        result["errors"].append("streaks_monthly_not_due")
        return result

    payload = get_streaks_monthly_payload(month_key)
    if not payload:
        result["errors"].append("invalid_month")
        return result
    if payload.get("is_empty"):
        result["errors"].append("streaks_monthly_empty")
        return result

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            skip_fb = _already_posted(cur, POST_TYPE_STREAKS_MONTHLY, month_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_STREAKS_MONTHLY, month_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping STREAKS_MONTHLY %s — already posted", month_key)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    png = generate_streaks_monthly_png(payload=payload)
    captions = {
        "facebook": build_streaks_monthly_caption(payload, include_link=True),
        "instagram": build_streaks_monthly_caption(payload, include_link=False),
    }
    return _publish_image_to_platforms(
        post_type=POST_TYPE_STREAKS_MONTHLY,
        subject_key=month_key,
        competition_id=None,
        png=png,
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_streaks_monthly_if_due() -> dict | None:
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping monthly streaks.")
        return None

    month_key = streaks_monthly_key_if_due()
    if month_key is None:
        return None

    try:
        result = post_streaks_monthly(month_key)
        if "streaks_monthly_empty" in result.get("errors", []):
            log.info("Monthly streaks %s skipped — empty.", month_key)
            return result
        log.info("Monthly streaks post for %s: %s", month_key, result)
        return result
    except Exception as e:
        log.exception("Unhandled error posting STREAKS_MONTHLY %s: %s", month_key, e)
        return {
            "post_type": POST_TYPE_STREAKS_MONTHLY,
            "subject_key": month_key,
            "competition_id": None,
            "facebook": None,
            "instagram": None,
            "errors": [str(e)],
        }
