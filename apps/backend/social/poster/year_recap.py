"""AÑO posts: year recap carousel (Dec 31)."""

from __future__ import annotations

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.calendar_mx import is_year_recap_due, year_recap_key_if_due
from social.digest_queries import fetch_year_recap_payload
from social.poster.shared import POST_TYPE_YEAR_RECAP, _already_posted, _publish_carousel_to_platforms
from social.year_recap_image import generate_year_recap_slides, plan_year_recap_slides


def get_year_recap_payload(year: int) -> dict:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            return fetch_year_recap_payload(cur, year)


def build_year_recap_caption(payload: dict, *, include_link: bool = True) -> str:
    year = payload["year"]
    next_year = payload.get("next_year") or year + 1
    comp_count = int(payload.get("comp_count") or 0)
    state_count = int(payload.get("state_count") or 0)
    parts: list[str] = [
        f"Así fue {year} en Cubing México.",
        "",
        f"{comp_count} competencias en {state_count} estados, con "
        f"{int(payload.get('competitor_count') or 0):,} competidores.",
    ]

    bits: list[str] = []
    debut_count = int(payload.get("debut_count") or 0)
    if debut_count:
        bits.append(f"{debut_count:,} debutantes")
    records = payload.get("record_counts") or {}
    for key, label in (("wr", "WR"), ("nar", "NAR"), ("nr", "NR")):
        if int(records.get(key) or 0):
            bits.append(f"{int(records[key])} {label}")
    if int(payload.get("sr_total") or 0):
        bits.append(f"{int(payload['sr_total']):,} SR")
    if int(payload.get("podium_count") or 0):
        bits.append(f"{int(payload['podium_count']):,} podios")
    if bits:
        parts.append("En números: " + " · ".join(bits))

    highlights = payload.get("record_highlights") or []
    if highlights:
        parts.append("")
        parts.append("Récords destacados:")
        for h in highlights[:5]:
            parts.append(f"• {h['level']} {h['event_name']} — {h['person_name']}")

    top_states = payload.get("top_states") or []
    if top_states:
        parts.append("")
        parts.append(
            "Estados con más competencias: " + ", ".join(f"{s['state_name']} ({s['count']})" for s in top_states[:3])
        )

    parts.append("")
    parts.append(
        f"Gracias a competidores, organizadores, delegados y voluntarios por un "
        f"año increíble. ¡Feliz {next_year}! Nos vemos en las competencias."
    )
    if include_link:
        parts.append("")
        parts.append("https://cubingmexico.net")
    parts.append("")
    parts.append("#CubingMéxico #FelizAñoNuevo #Speedcubing #WCA")
    return "\n".join(parts)


def get_year_recap_captions(year: int) -> dict[str, str]:
    payload = get_year_recap_payload(year)
    return {
        "facebook": build_year_recap_caption(payload, include_link=True),
        "instagram": build_year_recap_caption(payload, include_link=False),
    }


def generate_year_recap_slides_for_year(year: int) -> tuple[list[dict], dict]:
    payload = get_year_recap_payload(year)
    return generate_year_recap_slides(payload=payload), payload


def plan_year_recap_slides_for_year(year: int) -> tuple[list[dict], dict]:
    payload = get_year_recap_payload(year)
    return plan_year_recap_slides(payload), payload


def post_year_recap(year: int) -> dict:
    subject_key = str(year)
    result = {
        "post_type": POST_TYPE_YEAR_RECAP,
        "subject_key": subject_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    if not is_year_recap_due(year):
        result["errors"].append("year_recap_not_due")
        return result

    payload = get_year_recap_payload(year)
    if payload.get("is_empty"):
        result["errors"].append("year_recap_empty")
        return result

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            skip_fb = _already_posted(cur, POST_TYPE_YEAR_RECAP, subject_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_YEAR_RECAP, subject_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping YEAR_RECAP %s — already posted", year)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    slides = generate_year_recap_slides(payload=payload)
    if not slides:
        result["errors"].append("year_recap_empty")
        return result
    result["slide_count"] = len(slides)
    result["slide_ids"] = [slide["id"] for slide in slides]
    return _publish_carousel_to_platforms(
        post_type=POST_TYPE_YEAR_RECAP,
        subject_key=subject_key,
        competition_id=None,
        pngs=[slide["png"] for slide in slides],
        facebook_caption=build_year_recap_caption(payload, include_link=True),
        instagram_caption=build_year_recap_caption(payload, include_link=False),
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_year_recap_if_due() -> dict | None:
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping year recap.")
        return None

    year = year_recap_key_if_due()
    if year is None:
        return None

    try:
        result = post_year_recap(year)
        log.info("Year recap post for %s: %s", year, result)
        return result
    except Exception as e:
        log.exception("Unhandled error posting YEAR_RECAP %s: %s", year, e)
        return {
            "post_type": POST_TYPE_YEAR_RECAP,
            "subject_key": str(year),
            "competition_id": None,
            "facebook": None,
            "instagram": None,
            "errors": [str(e)],
        }
