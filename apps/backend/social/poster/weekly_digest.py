"""SEMANA posts: weekly competition digest."""

from __future__ import annotations

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.calendar_mx import is_weekly_digest_due, parse_iso_week_key, weekly_digest_key_if_due
from social.digest_queries import fetch_weekly_digest_payload
from social.poster.shared import POST_TYPE_WEEKLY_DIGEST, _already_posted, _publish_carousel_to_platforms
from social.weekly_digest_image import (
    generate_weekly_digest_png,
    generate_weekly_digest_slides,
    plan_weekly_digest_slides,
    weekly_cover_story,
)


def get_weekly_digest_payload(week_key: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            return fetch_weekly_digest_payload(cur, week_key)


WEEKLY_DIGEST_OPENERS = (
    "Resumen semanal Cubing México — competencias del {label}.",
    "Así se vivió la semana cubera en México ({label}).",
    "Lo mejor de las competencias del {label}.",
    "Tu dosis semanal de cubos: {label}.",
)


def _weekly_digest_opener(payload: dict) -> str:
    week_label = payload.get("competition_week_label") or payload.get("week_key")
    parsed = parse_iso_week_key(payload.get("week_key") or "")
    seed = parsed[1] if parsed else 0
    template = WEEKLY_DIGEST_OPENERS[seed % len(WEEKLY_DIGEST_OPENERS)]
    return template.format(label=week_label)


def build_weekly_digest_caption(payload: dict, *, include_link: bool = True) -> str:
    parts: list[str] = []
    story = weekly_cover_story(payload)
    if story and story.get("caption"):
        parts.append(story["caption"])
    parts.append(_weekly_digest_opener(payload))

    primary = payload.get("primary_comps") or []
    late = payload.get("late_comps") or []
    if primary:
        parts.append("")
        parts.append("Competencias:")
        for comp in primary[:8]:
            flag = "" if comp.get("has_results") else " (resultados pendientes)"
            parts.append(f"• {comp['name']}{flag}")
    if late:
        parts.append("")
        parts.append("Resultados que llegaron la semana pasada:")
        for comp in late[:6]:
            parts.append(f"• {comp['name']}")

    records = payload.get("record_counts") or {}
    wr = int(records.get("wr") or 0)
    nar = int(records.get("nar") or 0)
    nr = int(records.get("nr") or 0)
    sr_total = int(payload.get("sr_total") or 0)
    podium_count = int(payload.get("podium_count") or 0)
    debut_count = int(payload.get("debut_count") or 0)

    stats_bits: list[str] = []
    if wr:
        stats_bits.append(f"{wr} WR")
    if nar:
        stats_bits.append(f"{nar} NAR")
    if nr:
        stats_bits.append(f"{nr} NR")
    if sr_total:
        stats_bits.append(f"{sr_total} SR")
    if podium_count:
        stats_bits.append(f"{podium_count} podios")
    if debut_count:
        stats_bits.append(f"{debut_count} debutantes")
    if stats_bits:
        parts.append("")
        parts.append("En números: " + " · ".join(stats_bits))

    highlights = payload.get("record_highlights") or []
    if highlights:
        parts.append("")
        parts.append("Destacados:")
        for h in highlights[:5]:
            parts.append(f"• {h['level']} {h['event_name']} — {h['person_name']}")

    sr_states = payload.get("sr_by_state") or []
    if len(sr_states) >= 2:
        parts.append("")
        parts.append("SRs por estado: " + ", ".join(f"{r['state_name']} {r['count']}" for r in sr_states[:5]))

    upcoming = payload.get("upcoming_comps") or []
    if upcoming:
        parts.append("")
        parts.append("Próximas (14 días):")
        for comp in upcoming[:8]:
            parts.append(f"• {comp['name']}")

    if include_link:
        parts.append("")
        parts.append("https://cubingmexico.net")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing #Semana")
    return "\n".join(parts)


def get_weekly_digest_captions(week_key: str) -> dict[str, str] | None:
    payload = get_weekly_digest_payload(week_key)
    if not payload:
        return None
    return {
        "facebook": build_weekly_digest_caption(payload, include_link=True),
        "instagram": build_weekly_digest_caption(payload, include_link=False),
    }


def generate_weekly_digest_png_for_week(week_key: str) -> tuple[bytes, dict] | None:
    payload = get_weekly_digest_payload(week_key)
    if not payload:
        return None
    return generate_weekly_digest_png(payload=payload), payload


def generate_weekly_digest_slides_for_week(
    week_key: str,
) -> tuple[list[dict], dict] | None:
    """Return (slides [{id,title,png}], payload) or None if invalid week."""
    payload = get_weekly_digest_payload(week_key)
    if not payload:
        return None
    slides = generate_weekly_digest_slides(payload=payload)
    return slides, payload


def plan_weekly_digest_slides_for_week(week_key: str) -> tuple[list[dict], dict] | None:
    payload = get_weekly_digest_payload(week_key)
    if not payload:
        return None
    return plan_weekly_digest_slides(payload), payload


def post_weekly_digest(week_key: str) -> dict:
    result = {
        "post_type": POST_TYPE_WEEKLY_DIGEST,
        "subject_key": week_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    if parse_iso_week_key(week_key) is None:
        result["errors"].append("invalid_week")
        return result
    if not is_weekly_digest_due(week_key):
        result["errors"].append("weekly_digest_not_due")
        return result

    payload = get_weekly_digest_payload(week_key)
    if not payload:
        result["errors"].append("invalid_week")
        return result
    if payload.get("is_empty"):
        result["errors"].append("weekly_digest_empty")
        return result

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            skip_fb = _already_posted(cur, POST_TYPE_WEEKLY_DIGEST, week_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_WEEKLY_DIGEST, week_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping WEEKLY_DIGEST %s — already posted", week_key)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    slides = generate_weekly_digest_slides(payload=payload)
    if not slides:
        result["errors"].append("weekly_digest_empty")
        return result
    pngs = [slide["png"] for slide in slides]
    result["slide_count"] = len(slides)
    result["slide_ids"] = [slide["id"] for slide in slides]
    captions = {
        "facebook": build_weekly_digest_caption(payload, include_link=True),
        "instagram": build_weekly_digest_caption(payload, include_link=False),
    }
    return _publish_carousel_to_platforms(
        post_type=POST_TYPE_WEEKLY_DIGEST,
        subject_key=week_key,
        competition_id=None,
        pngs=pngs,
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_weekly_digest_if_due() -> dict | None:
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping weekly digest.")
        return None

    week_key = weekly_digest_key_if_due()
    if week_key is None:
        return None

    try:
        result = post_weekly_digest(week_key)
        if "weekly_digest_empty" in result.get("errors", []):
            log.info("Weekly digest %s skipped — empty week.", week_key)
            return result
        log.info("Weekly digest post for %s: %s", week_key, result)
        return result
    except Exception as e:
        log.exception("Unhandled error posting WEEKLY_DIGEST %s: %s", week_key, e)
        return {
            "post_type": POST_TYPE_WEEKLY_DIGEST,
            "subject_key": week_key,
            "competition_id": None,
            "facebook": None,
            "instagram": None,
            "errors": [str(e)],
        }
