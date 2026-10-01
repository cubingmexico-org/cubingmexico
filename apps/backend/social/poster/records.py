"""RÉCORDS posts: new NR/NAR/WR results."""

from __future__ import annotations

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.poster.shared import POST_TYPE_RECORD, _already_posted, _publish_image_to_platforms, fetch_record_markers
from social.records_image import generate_record_png
from social.upcoming_image import format_competition_date

_LEVEL_CAPTION = {
    "NR": "récord nacional",
    "NAR": "récord norteamericano",
    "WR": "récord mundial",
}

_KIND_CAPTION = {
    "single": "single",
    "average": "average",
}


def build_record_caption(
    *,
    person_name: str,
    person_id: str,
    event_name: str,
    kind: str,
    level: str,
    time_text: str,
    state_name: str | None = None,
    competition_name: str | None = None,
    competition_id: str | None = None,  # unused; only CM profile link is shared
    competition_start_date=None,
    competition_city_name: str | None = None,
    include_link: bool = True,
) -> str:
    _ = competition_id
    level_label = _LEVEL_CAPTION.get((level or "").upper(), "récord")
    kind_label = _KIND_CAPTION.get(kind, kind)
    person = (person_name or "").strip() or "Un competidor"
    state = (state_name or "").strip()
    event = (event_name or "").strip() or "su evento"
    who = f"{person} de {state}" if state else person

    sentence = f"{who} establece un nuevo {level_label} en {event} ({kind_label}) con un resultado de {time_text}"

    comp_name = (competition_name or "").strip()
    date_text = format_competition_date(competition_start_date)
    place = (competition_city_name or "").strip()

    if comp_name:
        sentence += f" en {comp_name}"
        if date_text:
            sentence += f" celebrado el pasado {date_text}"
        if place:
            sentence += f" en {place}"
    elif date_text or place:
        bits = []
        if date_text:
            bits.append(f"el pasado {date_text}")
        if place:
            bits.append(f"en {place}")
        sentence += " " + " ".join(bits)

    sentence += "."

    parts = [sentence]
    if include_link:
        parts.append("")
        parts.append(f"https://cubingmexico.net/persons/{person_id}")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing #Récord")
    return "\n".join(parts)


def _record_captions(marker: dict) -> dict[str, str]:
    from social.image_common import format_result_time

    time_text = format_result_time(marker["event_id"], marker["value"], kind=marker["kind"])
    kwargs = dict(
        person_name=marker["person_name"],
        person_id=marker["person_id"],
        event_name=marker["event_name"],
        kind=marker["kind"],
        level=marker["level"],
        time_text=time_text,
        state_name=marker.get("state_name"),
        competition_name=marker.get("competition_name"),
        competition_id=marker.get("competition_id"),
        competition_start_date=marker.get("competition_start_date"),
        competition_city_name=marker.get("competition_city_name"),
    )
    return {
        "facebook": build_record_caption(**kwargs, include_link=True),
        "instagram": build_record_caption(**kwargs, include_link=False),
    }


def get_record_details(subject_key: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            markers = fetch_record_markers(cur)
    return markers.get(subject_key)


def get_record_captions(subject_key: str) -> dict[str, str] | None:
    marker = get_record_details(subject_key)
    if not marker:
        return None
    return _record_captions(marker)


def generate_record_png_for_subject(subject_key: str) -> tuple[bytes, dict] | None:
    marker = get_record_details(subject_key)
    if not marker:
        return None
    png = generate_record_png(
        person_name=marker["person_name"],
        event_name=marker["event_name"],
        event_id=marker["event_id"],
        kind=marker["kind"],
        level=marker["level"],
        value=marker["value"],
        state_name=marker.get("state_name"),
        competition_name=marker.get("competition_name"),
    )
    return png, marker


def post_record(subject_key: str) -> dict:
    result = {
        "post_type": POST_TYPE_RECORD,
        "subject_key": subject_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            markers = fetch_record_markers(cur)
            marker = markers.get(subject_key)
            if not marker:
                result["errors"].append("record_not_found")
                return result
            result["competition_id"] = marker["competition_id"]
            skip_fb = _already_posted(cur, POST_TYPE_RECORD, subject_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_RECORD, subject_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping RECORD %s — already posted", subject_key)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    png = generate_record_png(
        person_name=marker["person_name"],
        event_name=marker["event_name"],
        event_id=marker["event_id"],
        kind=marker["kind"],
        level=marker["level"],
        value=marker["value"],
        state_name=marker.get("state_name"),
        competition_name=marker.get("competition_name"),
    )
    captions = _record_captions(marker)
    return _publish_image_to_platforms(
        post_type=POST_TYPE_RECORD,
        subject_key=subject_key,
        competition_id=marker["competition_id"],
        png=png,
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_new_records(
    before_markers: dict[str, dict] | None,
    after_markers: dict[str, dict] | None,
) -> list[dict]:
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping records.")
        return []

    before = set((before_markers or {}).keys())
    after = after_markers or {}
    new_keys = sorted(set(after.keys()) - before)
    if not new_keys:
        log.info("No newly tagged NR/NAR/WR records.")
        return []

    log.info("Posting RÉCORDS for %s new marker(s): %s", len(new_keys), new_keys)
    results = []
    for subject_key in new_keys:
        try:
            results.append(post_record(subject_key))
        except Exception as e:
            log.exception("Unhandled error posting RECORD %s: %s", subject_key, e)
            results.append(
                {
                    "post_type": POST_TYPE_RECORD,
                    "subject_key": subject_key,
                    "competition_id": after.get(subject_key, {}).get("competition_id"),
                    "facebook": None,
                    "instagram": None,
                    "errors": [str(e)],
                }
            )
    return results
