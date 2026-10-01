"""NÉMESIS posts: nemesis-free competitors."""

from __future__ import annotations

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.nemesis import fetch_nemesis_free
from social.nemesis_image import generate_nemesis_png
from social.poster.shared import POST_TYPE_NEMESIS, _already_posted, _publish_image_to_platforms, _record_post


def build_nemesis_caption(
    *,
    person_name: str,
    person_id: str,
    event_count: int,
    nemesized_count: int,
    state_name: str | None = None,
    include_link: bool = True,
) -> str:
    person = (person_name or "").strip() or "Un competidor"
    state = (state_name or "").strip()
    who = f"{person} de {state}" if state else person

    parts = [
        f"¡{who} ya no tiene némesis! Nadie en México lo supera en single y average en todos sus {event_count} eventos."
    ]
    if nemesized_count > 0:
        noun = "competidor lo tiene" if nemesized_count == 1 else "competidores lo tienen"
        parts.append("")
        parts.append(f"{nemesized_count:,} {noun} como némesis.")
    if include_link:
        parts.append("")
        parts.append(f"https://cubingmexico.net/persons/{person_id}")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing #Némesis")
    return "\n".join(parts)


def get_nemesis_details(subject_key: str) -> dict | None:
    """Return details when subject_key (a WCA ID) is currently nemesis-free."""
    wca_id = (subject_key or "").strip()
    if not wca_id:
        return None
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            person = fetch_nemesis_free(cur).get(wca_id)
    if not person:
        return None
    return {**person, "subject_key": wca_id}


def _nemesis_captions(details: dict) -> dict[str, str]:
    kwargs = dict(
        person_name=details["person_name"],
        person_id=details["wca_id"],
        event_count=details["event_count"],
        nemesized_count=details["nemesized_count"],
        state_name=details.get("state_name"),
    )
    return {
        "facebook": build_nemesis_caption(**kwargs, include_link=True),
        "instagram": build_nemesis_caption(**kwargs, include_link=False),
    }


def _nemesis_png(details: dict) -> bytes:
    return generate_nemesis_png(
        person_name=details["person_name"],
        event_count=details["event_count"],
        nemesized_count=details["nemesized_count"],
        state_name=details.get("state_name"),
    )


def get_nemesis_captions(subject_key: str) -> dict[str, str] | None:
    details = get_nemesis_details(subject_key)
    if not details:
        return None
    return _nemesis_captions(details)


def generate_nemesis_png_for_subject(subject_key: str) -> tuple[bytes, dict] | None:
    details = get_nemesis_details(subject_key)
    if not details:
        return None
    return _nemesis_png(details), details


def post_nemesis(subject_key: str, *, details: dict | None = None) -> dict:
    result = {
        "post_type": POST_TYPE_NEMESIS,
        "subject_key": subject_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    if details is None:
        details = get_nemesis_details(subject_key)
    if not details:
        result["errors"].append("nemesis_free_not_found")
        return result

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            skip_fb = _already_posted(cur, POST_TYPE_NEMESIS, subject_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_NEMESIS, subject_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping NÉMESIS %s — already posted", subject_key)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    captions = _nemesis_captions(details)
    return _publish_image_to_platforms(
        post_type=POST_TYPE_NEMESIS,
        subject_key=subject_key,
        competition_id=None,
        png=_nemesis_png(details),
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_new_nemesis_free(
    before_ids: set[str] | None,
    after_people: dict[str, dict] | None,
) -> list[dict]:
    """Post NÉMESIS for people who became nemesis-free between two snapshots."""
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping Némesis.")
        return []
    if before_ids is None:
        log.info("No nemesis snapshot before update; skipping Némesis posts.")
        return []

    changes = [
        {**person, "subject_key": wca_id}
        for wca_id, person in sorted((after_people or {}).items())
        if wca_id not in before_ids
    ]
    if not changes:
        log.info("No new nemesis-free competitors.")
        return []

    log.info(
        "Posting NÉMESIS for %s competitor(s): %s",
        len(changes),
        [c["subject_key"] for c in changes],
    )
    results = []
    for details in changes:
        try:
            results.append(post_nemesis(details["subject_key"], details=details))
        except Exception as e:
            log.exception("Unhandled error posting NÉMESIS %s: %s", details["subject_key"], e)
            results.append(
                {
                    "post_type": POST_TYPE_NEMESIS,
                    "subject_key": details["subject_key"],
                    "competition_id": None,
                    "facebook": None,
                    "instagram": None,
                    "errors": [str(e)],
                }
            )
    return results


def seed_nemesis_posted() -> dict:
    """Mark every current nemesis-free competitor as posted without calling Meta."""
    marked = 0
    skipped = 0
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            people = fetch_nemesis_free(cur)
            for wca_id in people:
                for platform in ("facebook", "instagram"):
                    if _already_posted(cur, POST_TYPE_NEMESIS, wca_id, platform):
                        skipped += 1
                        continue
                    _record_post(
                        cur,
                        post_type=POST_TYPE_NEMESIS,
                        subject_key=wca_id,
                        platform=platform,
                        external_id="backfill",
                    )
                    marked += 1
    log.info(
        "Seeded NÉMESIS social_posts: %s competitors, %s rows marked, %s already present",
        len(people),
        marked,
        skipped,
    )
    return {"competitors": len(people), "marked": marked, "skipped": skipped}
