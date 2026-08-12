"""Orchestrate typed social posts: RESULTADOS, RÉCORDS, PRÓXIMAS."""

from __future__ import annotations

import uuid
from typing import Iterable

import psycopg2.extras

from common import (
    PUBLIC_BASE_URL,
    SOCIAL_POSTS_ENABLED,
    get_connection,
    get_facebook_page_id,
    get_instagram_business_account_id,
    get_meta_page_access_token,
    log,
)
from social.media_store import delete_media, put_media
from social.meta import MetaApiError, post_facebook_photo, post_instagram_image
from social.records_image import generate_record_png
from social.resultados_image import generate_resultados_png, png_bytes_to_jpeg
from social.image_common import format_place_line
from social.upcoming_image import format_competition_date, generate_upcoming_png

POST_TYPE_RESULTADOS = "resultados"
POST_TYPE_RECORD = "record"
POST_TYPE_UPCOMING = "upcoming"

MX_COMPS_WITH_RESULTS_SQL = """
    SELECT DISTINCT r.competition_id
    FROM results r
    JOIN competitions c ON c.id = r.competition_id
    WHERE c.country_id = 'Mexico'
"""

RECORD_MARKERS_SQL = """
    SELECT
        r.id AS result_id,
        r.person_id,
        r.event_id,
        r.competition_id,
        r.best,
        r.average,
        r.regional_single_record,
        r.regional_average_record,
        p.name AS person_name,
        e.name AS event_name,
        s.name AS state_name
    FROM results r
    JOIN persons p ON p.wca_id = r.person_id
    JOIN events e ON e.id = r.event_id
    LEFT JOIN states s ON s.id = p.state_id
    WHERE r.regional_single_record IN ('NR', 'NAR', 'WR')
       OR r.regional_average_record IN ('NR', 'NAR', 'WR')
"""


def fetch_mexican_competition_ids_with_results(cur) -> set[str]:
    cur.execute(MX_COMPS_WITH_RESULTS_SQL)
    return {row.competition_id for row in cur.fetchall()}


def fetch_record_markers(cur) -> dict[str, dict]:
    """Return subject_key → marker details for NR/NAR/WR singles and averages."""
    cur.execute(RECORD_MARKERS_SQL)
    markers: dict[str, dict] = {}
    for row in cur.fetchall():
        base = {
            "result_id": row.result_id,
            "person_id": row.person_id,
            "person_name": row.person_name,
            "state_name": row.state_name,
            "event_id": row.event_id,
            "event_name": row.event_name,
            "competition_id": row.competition_id,
        }
        if row.regional_single_record in ("NR", "NAR", "WR"):
            key = f"{row.result_id}:single"
            markers[key] = {
                **base,
                "subject_key": key,
                "kind": "single",
                "level": row.regional_single_record,
                "value": row.best,
            }
        if row.regional_average_record in ("NR", "NAR", "WR"):
            key = f"{row.result_id}:average"
            markers[key] = {
                **base,
                "subject_key": key,
                "kind": "average",
                "level": row.regional_average_record,
                "value": row.average,
            }
    return markers


def _already_posted(cur, post_type: str, subject_key: str, platform: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM social_posts
        WHERE post_type = %s AND subject_key = %s AND platform = %s
        LIMIT 1
        """,
        (post_type, subject_key, platform),
    )
    return cur.fetchone() is not None


def _record_post(
    cur,
    *,
    post_type: str,
    subject_key: str,
    platform: str,
    external_id: str | None,
    competition_id: str | None = None,
) -> None:
    cur.execute(
        """
        INSERT INTO social_posts
            (id, post_type, subject_key, competition_id, platform, external_id, posted_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (post_type, subject_key, platform) DO NOTHING
        """,
        (
            str(uuid.uuid4()),
            post_type,
            subject_key,
            competition_id,
            platform,
            external_id,
        ),
    )


def _competition_details(cur, competition_id: str, *, mexico_only: bool = True) -> dict | None:
    sql = """
        SELECT
            c.id,
            c.name,
            c.city_name,
            c.start_date,
            c.end_date,
            c.cancelled,
            c.country_id,
            s.name AS state_name
        FROM competitions c
        LEFT JOIN states s ON s.id = c.state_id
        WHERE c.id = %s
    """
    if mexico_only:
        sql += " AND c.country_id = 'Mexico'"
    cur.execute(sql, (competition_id,))
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row.id,
        "name": row.name,
        "city_name": row.city_name,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "cancelled": bool(row.cancelled),
        "country_id": row.country_id,
        "state_name": row.state_name,
    }


def _competition_title(comp: dict) -> str:
    return (comp.get("name") or "").strip() or "México"


def _year(comp: dict) -> str:
    start = comp.get("start_date")
    if start is None:
        return ""
    return str(start.year)


def _display_name_and_year(comp: dict) -> tuple[str, str]:
    """Use competition name on the graphic; omit year if already in the name."""
    name = _competition_title(comp)
    year = _year(comp)
    if year and name.endswith(year):
        return name, ""
    return name, year


def _public_media_url(token: str) -> str:
    base = (PUBLIC_BASE_URL or "").rstrip("/")
    if not base:
        raise RuntimeError(
            "PUBLIC_BASE_URL is required to host temporary images for Instagram"
        )
    return f"{base}/social/media/{token}.jpg"


def _publish_image_to_platforms(
    *,
    post_type: str,
    subject_key: str,
    competition_id: str | None,
    png: bytes,
    facebook_caption: str,
    instagram_caption: str,
    skip_fb: bool,
    skip_ig: bool,
    result: dict,
) -> dict:
    media_token = None
    facebook_page_id = get_facebook_page_id()
    meta_token = get_meta_page_access_token()
    ig_user_id = get_instagram_business_account_id()

    try:
        if not skip_fb:
            if not facebook_page_id or not meta_token:
                result["errors"].append("facebook_credentials_missing")
            else:
                try:
                    fb_id = post_facebook_photo(
                        page_id=facebook_page_id,
                        access_token=meta_token,
                        image_bytes=png,
                        caption=facebook_caption,
                    )
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            _record_post(
                                cur,
                                post_type=post_type,
                                subject_key=subject_key,
                                competition_id=competition_id,
                                platform="facebook",
                                external_id=fb_id,
                            )
                    result["facebook"] = fb_id
                    log.info(
                        "Posted Facebook %s for %s (%s)",
                        post_type,
                        subject_key,
                        fb_id,
                    )
                except MetaApiError as e:
                    log.error("Facebook post failed for %s/%s: %s", post_type, subject_key, e)
                    result["errors"].append(f"facebook:{e}")

        if not skip_ig:
            if not ig_user_id or not meta_token:
                result["errors"].append("instagram_credentials_missing")
            elif not PUBLIC_BASE_URL:
                result["errors"].append("public_base_url_missing")
            else:
                try:
                    jpeg = png_bytes_to_jpeg(png)
                    media_token = put_media(jpeg, content_type="image/jpeg")
                    image_url = _public_media_url(media_token)
                    ig_id = post_instagram_image(
                        ig_user_id=ig_user_id,
                        access_token=meta_token,
                        image_url=image_url,
                        caption=instagram_caption,
                    )
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            _record_post(
                                cur,
                                post_type=post_type,
                                subject_key=subject_key,
                                competition_id=competition_id,
                                platform="instagram",
                                external_id=ig_id,
                            )
                    result["instagram"] = ig_id
                    log.info(
                        "Posted Instagram %s for %s (%s)",
                        post_type,
                        subject_key,
                        ig_id,
                    )
                except (MetaApiError, RuntimeError) as e:
                    log.error(
                        "Instagram post failed for %s/%s: %s", post_type, subject_key, e
                    )
                    result["errors"].append(f"instagram:{e}")
    finally:
        if media_token:
            delete_media(media_token)

    return result


# --- RESULTADOS -----------------------------------------------------------------


def build_resultados_caption(
    *,
    competition_name: str,
    competition_id: str,
    include_link: bool = True,
) -> str:
    """Caption for RESULTADOS posts. Instagram captions omit the URL (not clickable)."""
    name = (competition_name or "").strip() or competition_id
    parts = [f"Resultados de {name} ya disponibles en Cubing México."]
    if include_link:
        parts.append("")
        parts.append(
            f"https://cubingmexico.net/competitions/{competition_id}/results/podiums"
        )
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing")
    return "\n".join(parts)


def _resultados_caption(comp: dict, *, include_link: bool = True) -> str:
    return build_resultados_caption(
        competition_name=comp.get("name") or "",
        competition_id=comp["id"],
        include_link=include_link,
    )


def get_competition_resultados_captions(competition_id: str) -> dict[str, str] | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
    if not comp:
        return None
    return {
        "facebook": _resultados_caption(comp, include_link=True),
        "instagram": _resultados_caption(comp, include_link=False),
    }


def get_competition_resultados_caption(
    competition_id: str,
    *,
    include_link: bool = True,
) -> str | None:
    captions = get_competition_resultados_captions(competition_id)
    if not captions:
        return None
    return captions["facebook"] if include_link else captions["instagram"]


def generate_competition_resultados_png(competition_id: str) -> tuple[bytes, dict] | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
    if not comp:
        return None
    name, year = _display_name_and_year(comp)
    png = generate_resultados_png(competition_name=name, year=year)
    return png, comp


def post_competition_resultados(competition_id: str) -> dict:
    """Generate and post RESULTADOS for one Mexican competition. Best-effort per platform."""
    result = {
        "post_type": POST_TYPE_RESULTADOS,
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

            skip_fb = _already_posted(
                cur, POST_TYPE_RESULTADOS, competition_id, "facebook"
            )
            skip_ig = _already_posted(
                cur, POST_TYPE_RESULTADOS, competition_id, "instagram"
            )

    if skip_fb and skip_ig:
        log.info("Skipping RESULTADOS %s — already posted", competition_id)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    name, year = _display_name_and_year(comp)
    png = generate_resultados_png(competition_name=name, year=year)
    return _publish_image_to_platforms(
        post_type=POST_TYPE_RESULTADOS,
        subject_key=competition_id,
        competition_id=competition_id,
        png=png,
        facebook_caption=_resultados_caption(comp, include_link=True),
        instagram_caption=_resultados_caption(comp, include_link=False),
        skip_fb=skip_fb,
        skip_ig=skip_ig,
        result=result,
    )


def mark_competition_posted(
    competition_id: str,
    platforms: Iterable[str] | None = None,
    *,
    external_id: str = "manual",
) -> dict:
    """Record RESULTADOS social_posts rows without calling Meta."""
    return mark_typed_posted(
        POST_TYPE_RESULTADOS,
        competition_id,
        platforms,
        competition_id=competition_id,
        external_id=external_id,
        require_mexico_competition=True,
    )


def post_new_mexican_results(
    before_ids: Iterable[str] | None,
    after_ids: Iterable[str] | None,
) -> list[dict]:
    """Post RESULTADOS for MX competitions newly present in the results set."""
    if not SOCIAL_POSTS_ENABLED:
        log.info("Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping.")
        return []

    before = set(before_ids or [])
    after = set(after_ids or [])
    new_ids = sorted(after - before)
    if not new_ids:
        log.info("No newly posted Mexican competitions with results.")
        return []

    log.info("Posting RESULTADOS for %s new Mexican competition(s): %s", len(new_ids), new_ids)
    results = []
    for competition_id in new_ids:
        try:
            results.append(post_competition_resultados(competition_id))
        except Exception as e:
            log.exception("Unhandled error posting RESULTADOS for %s: %s", competition_id, e)
            results.append(
                {
                    "post_type": POST_TYPE_RESULTADOS,
                    "subject_key": competition_id,
                    "competition_id": competition_id,
                    "facebook": None,
                    "instagram": None,
                    "errors": [str(e)],
                }
            )
    return results


# --- RÉCORDS --------------------------------------------------------------------


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
    include_link: bool = True,
) -> str:
    level_label = _LEVEL_CAPTION.get((level or "").upper(), "récord")
    kind_label = _KIND_CAPTION.get(kind, kind)
    state = (state_name or "").strip()
    who = f"{person_name} ({state})" if state else person_name
    parts = [
        f"¡{who} establece un nuevo {level_label}!",
        f"{event_name} ({kind_label}): {time_text}",
    ]
    if include_link:
        parts.append("")
        parts.append(f"https://cubingmexico.net/persons/{person_id}")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing #Récord")
    return "\n".join(parts)


def _record_captions(marker: dict) -> dict[str, str]:
    from social.image_common import format_result_time

    time_text = format_result_time(
        marker["event_id"], marker["value"], kind=marker["kind"]
    )
    kwargs = dict(
        person_name=marker["person_name"],
        person_id=marker["person_id"],
        event_name=marker["event_name"],
        kind=marker["kind"],
        level=marker["level"],
        time_text=time_text,
        state_name=marker.get("state_name"),
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


# --- PRÓXIMAS -------------------------------------------------------------------


def build_upcoming_caption(
    *,
    competition_name: str,
    competition_id: str,
    start_date,
    city_name: str,
    state_name: str | None = None,
    include_link: bool = True,
) -> str:
    name = (competition_name or "").strip() or competition_id
    date_text = format_competition_date(start_date)
    place = format_place_line(city_name, state_name)

    parts = [f"¡Nueva competencia en México! {name}"]
    if date_text:
        parts.append(date_text)
    if place:
        parts.append(place)
    if include_link:
        parts.append("")
        parts.append(f"https://cubingmexico.net/competitions/{competition_id}")
    parts.append("")
    parts.append("#CubingMéxico #WCA #Speedcubing")
    return "\n".join(parts)


def _upcoming_captions(comp: dict) -> dict[str, str]:
    kwargs = dict(
        competition_name=comp.get("name") or "",
        competition_id=comp["id"],
        start_date=comp.get("start_date"),
        city_name=comp.get("city_name") or "",
        state_name=comp.get("state_name"),
    )
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
        city_name=comp.get("city_name") or "",
        state_name=comp.get("state_name"),
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
            skip_fb = _already_posted(
                cur, POST_TYPE_UPCOMING, competition_id, "facebook"
            )
            skip_ig = _already_posted(
                cur, POST_TYPE_UPCOMING, competition_id, "instagram"
            )

    if skip_fb and skip_ig:
        log.info("Skipping UPCOMING %s — already posted", competition_id)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    png = generate_upcoming_png(
        competition_name=comp["name"],
        start_date=comp.get("start_date"),
        city_name=comp.get("city_name") or "",
        state_name=comp.get("state_name"),
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


# --- Shared mark ----------------------------------------------------------------


def mark_typed_posted(
    post_type: str,
    subject_key: str,
    platforms: Iterable[str] | None = None,
    *,
    competition_id: str | None = None,
    external_id: str = "manual",
    require_mexico_competition: bool = False,
) -> dict:
    wanted = {p.lower() for p in (platforms or ("facebook", "instagram"))}
    wanted &= {"facebook", "instagram"}
    result = {
        "post_type": post_type,
        "subject_key": subject_key,
        "competition_id": competition_id,
        "marked": [],
        "skipped": [],
        "errors": [],
    }

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            resolved_competition_id = competition_id
            if post_type == POST_TYPE_RESULTADOS or require_mexico_competition:
                comp = _competition_details(cur, subject_key)
                if not comp:
                    result["errors"].append("competition_not_found_or_not_mexico")
                    return result
                resolved_competition_id = subject_key
            elif post_type == POST_TYPE_UPCOMING:
                comp = _competition_details(cur, subject_key)
                if not comp:
                    result["errors"].append("competition_not_found_or_not_mexico")
                    return result
                resolved_competition_id = subject_key
            elif post_type == POST_TYPE_RECORD:
                markers = fetch_record_markers(cur)
                marker = markers.get(subject_key)
                if not marker:
                    result["errors"].append("record_not_found")
                    return result
                resolved_competition_id = marker["competition_id"]

            result["competition_id"] = resolved_competition_id

            for platform in sorted(wanted):
                if _already_posted(cur, post_type, subject_key, platform):
                    result["skipped"].append(platform)
                    continue
                _record_post(
                    cur,
                    post_type=post_type,
                    subject_key=subject_key,
                    competition_id=resolved_competition_id,
                    platform=platform,
                    external_id=external_id,
                )
                result["marked"].append(platform)

    return result
