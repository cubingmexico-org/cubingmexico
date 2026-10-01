"""MOLLERZ posts: new members and tier upgrades."""

from __future__ import annotations

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.mollerz import fetch_mollerz_members, mollerz_subject_key, parse_mollerz_subject_key, tier_rank
from social.mollerz_image import generate_mollerz_png
from social.poster.shared import POST_TYPE_MOLLERZ, _already_posted, _publish_image_to_platforms, _record_post


def build_mollerz_caption(
    *,
    person_name: str,
    person_id: str,
    tier: str,
    is_new_member: bool,
    state_name: str | None = None,
    include_link: bool = True,
) -> str:
    person = (person_name or "").strip() or "Un competidor"
    state = (state_name or "").strip()
    who = f"{person} de {state}" if state else person

    if is_new_member:
        sentence = (
            f"¡{who} es nuevo miembro Mollerz! Ya compitió en todos los eventos "
            f"oficiales de la WCA y entra con el nivel {tier}."
        )
    else:
        sentence = f"¡{who} sube al nivel {tier} de Mollerz!"

    parts = [sentence]
    if include_link:
        parts.append("")
        parts.append(f"https://cubingmexico.net/persons/{person_id}")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing #Mollerz")
    return "\n".join(parts)


def _mollerz_has_prior_post(cur, wca_id: str, subject_key: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM social_posts
        WHERE post_type = %s AND subject_key LIKE %s AND subject_key <> %s
        LIMIT 1
        """,
        (POST_TYPE_MOLLERZ, f"{wca_id}:%", subject_key),
    )
    return cur.fetchone() is not None


def get_mollerz_details(subject_key: str) -> dict | None:
    """Return member details when subject_key matches the person's current tier."""
    parsed = parse_mollerz_subject_key(subject_key)
    if not parsed:
        return None
    wca_id, tier = parsed
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            member = fetch_mollerz_members(cur).get(wca_id)
            if not member or member["tier"] != tier:
                return None
            is_new_member = not _mollerz_has_prior_post(cur, wca_id, subject_key)
    return {**member, "subject_key": subject_key, "is_new_member": is_new_member}


def _mollerz_captions(details: dict) -> dict[str, str]:
    kwargs = dict(
        person_name=details["person_name"],
        person_id=details["wca_id"],
        tier=details["tier"],
        is_new_member=details["is_new_member"],
        state_name=details.get("state_name"),
    )
    return {
        "facebook": build_mollerz_caption(**kwargs, include_link=True),
        "instagram": build_mollerz_caption(**kwargs, include_link=False),
    }


def _mollerz_png(details: dict) -> bytes:
    return generate_mollerz_png(
        person_name=details["person_name"],
        tier=details["tier"],
        is_new_member=details["is_new_member"],
        conditions=details["conditions"],
        state_name=details.get("state_name"),
    )


def get_mollerz_captions(subject_key: str) -> dict[str, str] | None:
    details = get_mollerz_details(subject_key)
    if not details:
        return None
    return _mollerz_captions(details)


def generate_mollerz_png_for_subject(subject_key: str) -> tuple[bytes, dict] | None:
    details = get_mollerz_details(subject_key)
    if not details:
        return None
    return _mollerz_png(details), details


def post_mollerz(subject_key: str, *, details: dict | None = None) -> dict:
    result = {
        "post_type": POST_TYPE_MOLLERZ,
        "subject_key": subject_key,
        "competition_id": None,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    if details is None:
        details = get_mollerz_details(subject_key)
    if not details:
        result["errors"].append("mollerz_member_not_found")
        return result

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            skip_fb = _already_posted(cur, POST_TYPE_MOLLERZ, subject_key, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_MOLLERZ, subject_key, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping MOLLERZ %s — already posted", subject_key)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    captions = _mollerz_captions(details)
    return _publish_image_to_platforms(
        post_type=POST_TYPE_MOLLERZ,
        subject_key=subject_key,
        competition_id=None,
        png=_mollerz_png(details),
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_new_mollerz(
    before_members: dict[str, dict] | None,
    after_members: dict[str, dict] | None,
) -> list[dict]:
    """Post MOLLERZ for new members and tier upgrades between two snapshots."""
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping Mollerz.")
        return []
    if before_members is None:
        log.info("No Mollerz snapshot before import; skipping Mollerz posts.")
        return []

    changes: list[dict] = []
    for wca_id, member in sorted((after_members or {}).items()):
        previous = before_members.get(wca_id)
        if previous is None:
            is_new_member = True
        elif tier_rank(member["tier"]) > tier_rank(previous["tier"]):
            is_new_member = False
        else:
            continue
        subject_key = mollerz_subject_key(wca_id, member["tier"])
        changes.append({**member, "subject_key": subject_key, "is_new_member": is_new_member})

    if not changes:
        log.info("No new Mollerz members or tier upgrades.")
        return []

    log.info(
        "Posting MOLLERZ for %s change(s): %s",
        len(changes),
        [c["subject_key"] for c in changes],
    )
    results = []
    for details in changes:
        try:
            results.append(post_mollerz(details["subject_key"], details=details))
        except Exception as e:
            log.exception("Unhandled error posting MOLLERZ %s: %s", details["subject_key"], e)
            results.append(
                {
                    "post_type": POST_TYPE_MOLLERZ,
                    "subject_key": details["subject_key"],
                    "competition_id": None,
                    "facebook": None,
                    "instagram": None,
                    "errors": [str(e)],
                }
            )
    return results


def seed_mollerz_posted() -> dict:
    """Mark every current member's current tier as posted without calling Meta."""
    marked = 0
    skipped = 0
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            members = fetch_mollerz_members(cur)
            for wca_id, member in members.items():
                subject_key = mollerz_subject_key(wca_id, member["tier"])
                for platform in ("facebook", "instagram"):
                    if _already_posted(cur, POST_TYPE_MOLLERZ, subject_key, platform):
                        skipped += 1
                        continue
                    _record_post(
                        cur,
                        post_type=POST_TYPE_MOLLERZ,
                        subject_key=subject_key,
                        platform=platform,
                        external_id="backfill",
                    )
                    marked += 1
    log.info(
        "Seeded MOLLERZ social_posts: %s members, %s rows marked, %s already present",
        len(members),
        marked,
        skipped,
    )
    return {"members": len(members), "marked": marked, "skipped": skipped}
