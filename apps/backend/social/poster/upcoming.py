"""PRÓXIMAS posts: newly announced Mexican competitions."""

from __future__ import annotations

from typing import Iterable

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.image_common import format_place_line
from social.poster.shared import POST_TYPE_UPCOMING, _already_posted, _competition_details, _publish_image_to_platforms
from social.upcoming_image import format_competition_date_range, format_competition_datetime, generate_upcoming_png
from social.wca_competition import fetch_wca_competition, format_entry_fee, parse_wca_datetime


def _event_names_for_ids(cur, event_ids: list[str]) -> list[str]:
    if not event_ids:
        return []
    cur.execute(
        """
        SELECT id, name, rank
        FROM events
        WHERE id IN %s
        ORDER BY rank ASC, name ASC
        """,
        (tuple(event_ids),),
    )
    by_id = {row.id: row.name for row in cur.fetchall()}
    # Preserve WCA event order when known; fall back to DB order for the rest.
    ordered = [by_id[eid] for eid in event_ids if eid in by_id]
    missing = [eid for eid in event_ids if eid not in by_id]
    return ordered + missing


def build_upcoming_caption(
    *,
    competition_name: str,
    competition_id: str,
    start_date,
    city_name: str,
    state_name: str | None = None,
    entry_fee: str | None = None,
    registration_open_text: str | None = None,
    registration_close_text: str | None = None,
    event_names: list[str] | None = None,
    competitor_limit: int | None = None,
    include_link: bool = True,
    end_date=None,
) -> str:
    name = (competition_name or "").strip() or competition_id
    date_text = format_competition_date_range(start_date, end_date)
    place = format_place_line(city_name, state_name)

    parts = [f"¡Próxima competencia en México! {name}"]
    if date_text:
        parts.append(f"Fecha: {date_text}")
    if place:
        parts.append(f"Lugar: {place}")
    if entry_fee:
        parts.append(f"Cuota: {entry_fee}")
    if registration_open_text and registration_close_text:
        parts.append(f"Inscripciones: del {registration_open_text} al {registration_close_text}")
    elif registration_open_text:
        parts.append(f"Inscripciones abren: {registration_open_text}")
    elif registration_close_text:
        parts.append(f"Inscripciones cierran: {registration_close_text}")
    if event_names:
        parts.append(f"Eventos ({len(event_names)}): {', '.join(event_names)}")
    if competitor_limit:
        parts.append(f"Límite: {competitor_limit} competidores")
    if include_link:
        parts.append("")
        parts.append(f"https://www.worldcubeassociation.org/competitions/{competition_id}/register")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing")
    return "\n".join(parts)


def _upcoming_caption_details(comp: dict) -> dict:
    """Merge local competition row with live WCA API details for captions."""
    competition_id = comp["id"]
    details: dict = {
        "competition_name": comp.get("name") or "",
        "competition_id": competition_id,
        "start_date": comp.get("start_date"),
        "end_date": comp.get("end_date"),
        "city_name": comp.get("city_name") or "",
        "state_name": comp.get("state_name"),
        "entry_fee": None,
        "registration_open_text": None,
        "registration_close_text": None,
        "event_names": None,
        "competitor_limit": None,
    }

    wca = fetch_wca_competition(competition_id)
    if not wca:
        return details

    fee = format_entry_fee(
        wca.get("base_entry_fee_lowest_denomination"),
        wca.get("currency_code"),
    )
    if fee:
        details["entry_fee"] = fee

    open_dt = parse_wca_datetime(wca.get("registration_open"))
    close_dt = parse_wca_datetime(wca.get("registration_close"))
    # Present registration times in Mexico City for social posts.
    try:
        from zoneinfo import ZoneInfo

        mx = ZoneInfo("America/Mexico_City")
        if open_dt and open_dt.tzinfo is not None:
            open_dt = open_dt.astimezone(mx)
        if close_dt and close_dt.tzinfo is not None:
            close_dt = close_dt.astimezone(mx)
    except Exception:
        pass

    open_text = format_competition_datetime(open_dt)
    close_text = format_competition_datetime(close_dt)
    if open_text:
        details["registration_open_text"] = open_text
    if close_text:
        details["registration_close_text"] = close_text

    event_ids = wca.get("event_ids") or []
    if isinstance(event_ids, list) and event_ids:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                details["event_names"] = _event_names_for_ids(cur, [str(e) for e in event_ids])

    limit = wca.get("competitor_limit")
    if isinstance(limit, int) and limit > 0:
        details["competitor_limit"] = limit

    return details


def _upcoming_captions(comp: dict) -> dict[str, str]:
    kwargs = _upcoming_caption_details(comp)
    return {
        "facebook": build_upcoming_caption(**kwargs, include_link=True),
        "instagram": build_upcoming_caption(**kwargs, include_link=False),
    }


def get_upcoming_captions(competition_id: str) -> dict[str, str] | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
    if not comp:
        return None
    return _upcoming_captions(comp)


def generate_upcoming_png_for_competition(
    competition_id: str,
) -> tuple[bytes, dict] | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
    if not comp:
        return None
    png = generate_upcoming_png(
        competition_name=comp["name"],
        start_date=comp.get("start_date"),
        end_date=comp.get("end_date"),
        city_name=comp.get("city_name") or "",
        state_name=comp.get("state_name"),
        logo_url=comp.get("logo"),
    )
    return png, comp


def post_upcoming_competition(competition_id: str) -> dict:
    result = {
        "post_type": POST_TYPE_UPCOMING,
        "subject_key": competition_id,
        "competition_id": competition_id,
        "facebook": None,
        "instagram": None,
        "errors": [],
    }

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
            if not comp:
                result["errors"].append("competition_not_found_or_not_mexico")
                return result
            if comp.get("cancelled"):
                result["errors"].append("competition_cancelled")
                return result
            skip_fb = _already_posted(cur, POST_TYPE_UPCOMING, competition_id, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_UPCOMING, competition_id, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping UPCOMING %s — already posted", competition_id)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    png = generate_upcoming_png(
        competition_name=comp["name"],
        start_date=comp.get("start_date"),
        end_date=comp.get("end_date"),
        city_name=comp.get("city_name") or "",
        state_name=comp.get("state_name"),
        logo_url=comp.get("logo"),
    )
    captions = _upcoming_captions(comp)
    return _publish_image_to_platforms(
        post_type=POST_TYPE_UPCOMING,
        subject_key=competition_id,
        competition_id=competition_id,
        png=png,
        facebook_caption=captions["facebook"],
        instagram_caption=captions["instagram"],
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def post_new_upcoming_competitions(competition_ids: Iterable[str] | None) -> list[dict]:
    """Post PRÓXIMAS for newly inserted Mexican competitions that are still upcoming."""
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping upcoming.")
        return []

    ids = sorted({cid for cid in (competition_ids or []) if cid})
    if not ids:
        return []

    eligible: list[str] = []
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            for competition_id in ids:
                cur.execute(
                    """
                    SELECT id FROM competitions
                    WHERE id = %s
                      AND country_id = 'Mexico'
                      AND cancelled = false
                      AND start_date > NOW()
                    """,
                    (competition_id,),
                )
                if cur.fetchone():
                    eligible.append(competition_id)

    if not eligible:
        log.info("No newly inserted upcoming Mexican competitions to post.")
        return []

    log.info("Posting PRÓXIMAS for %s competition(s): %s", len(eligible), eligible)
    results = []
    for competition_id in eligible:
        try:
            results.append(post_upcoming_competition(competition_id))
        except Exception as e:
            log.exception("Unhandled error posting UPCOMING %s: %s", competition_id, e)
            results.append(
                {
                    "post_type": POST_TYPE_UPCOMING,
                    "subject_key": competition_id,
                    "competition_id": competition_id,
                    "facebook": None,
                    "instagram": None,
                    "errors": [str(e)],
                }
            )
    return results
