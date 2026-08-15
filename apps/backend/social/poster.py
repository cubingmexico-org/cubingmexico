"""Orchestrate typed social posts: RESULTADOS, RÉCORDS, PRÓXIMAS, RESUMEN, SEMANA, RACHAS."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
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
from social.calendar_mx import (
    is_streaks_monthly_due,
    is_weekly_digest_due,
    parse_iso_week_key,
    parse_month_key,
    streaks_monthly_key_if_due,
    weekly_digest_key_if_due,
)
from social.digest_queries import (
    fetch_streaks_monthly_payload,
    fetch_weekly_digest_payload,
)
from social.media_store import delete_media, put_media
from social.meta import (
    MetaApiError,
    post_facebook_multi_photo,
    post_facebook_photo,
    post_instagram_carousel,
    post_instagram_image,
)
from social.records_image import generate_record_png
from social.resultados_image import generate_resultados_png, png_bytes_to_jpeg
from social.image_common import format_place_line
from social.streaks_monthly_image import generate_streaks_monthly_png
from social.summary_unlock_image import generate_summary_unlock_png
from social.upcoming_image import (
    format_competition_date,
    format_competition_datetime,
    generate_upcoming_png,
)
from social.wca_competition import (
    fetch_wca_competition,
    format_entry_fee,
    parse_wca_datetime,
)
from social.weekly_digest_image import (
    generate_weekly_digest_png,
    generate_weekly_digest_slides,
    plan_weekly_digest_slides,
)

POST_TYPE_RESULTADOS = "resultados"
POST_TYPE_RECORD = "record"
POST_TYPE_UPCOMING = "upcoming"
POST_TYPE_SUMMARY_UNLOCK = "summary_unlock"
POST_TYPE_WEEKLY_DIGEST = "weekly_digest"
POST_TYPE_STREAKS_MONTHLY = "streaks_monthly"

# Mirror apps/web/app/(root)/summary/_lib/summary-year.ts
CURRENT_YEAR_SUMMARY_UNLOCK_DAY = 20

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
        s.name AS state_name,
        c.name AS competition_name,
        c.start_date AS competition_start_date,
        c.city_name AS competition_city_name
    FROM results r
    JOIN persons p ON p.wca_id = r.person_id
    JOIN events e ON e.id = r.event_id
    LEFT JOIN states s ON s.id = p.state_id
    LEFT JOIN competitions c ON c.id = r.competition_id
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
            "competition_name": row.competition_name,
            "competition_start_date": row.competition_start_date,
            "competition_city_name": row.competition_city_name,
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
            c.logo,
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
    logo = (row.logo or "").strip() or None
    return {
        "id": row.id,
        "name": row.name,
        "city_name": row.city_name,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "cancelled": bool(row.cancelled),
        "country_id": row.country_id,
        "logo": logo,
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
    # Central kill switch for Meta publishes (auto + manual admin). Leave false
    # in development/staging so image download / mark-as-posted still work.
    if not SOCIAL_POSTS_ENABLED:
        log.info(
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). "
            "Skipping Meta publish for %s/%s.",
            post_type,
            subject_key,
        )
        result["errors"].append("social_posts_disabled")
        return result

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


def _publish_carousel_to_platforms(
    *,
    post_type: str,
    subject_key: str,
    competition_id: str | None,
    pngs: list[bytes],
    facebook_caption: str,
    instagram_caption: str,
    skip_fb: bool,
    skip_ig: bool,
    result: dict,
) -> dict:
    """Publish one or more images; uses carousel APIs when len(pngs) > 1."""
    if not pngs:
        result["errors"].append("carousel_empty")
        return result
    if len(pngs) == 1:
        return _publish_image_to_platforms(
            post_type=post_type,
            subject_key=subject_key,
            competition_id=competition_id,
            png=pngs[0],
            facebook_caption=facebook_caption,
            instagram_caption=instagram_caption,
            skip_fb=skip_fb,
            skip_ig=skip_ig,
            result=result,
        )

    if not SOCIAL_POSTS_ENABLED:
        log.info(
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). "
            "Skipping Meta carousel publish for %s/%s.",
            post_type,
            subject_key,
        )
        result["errors"].append("social_posts_disabled")
        return result

    media_tokens: list[str] = []
    facebook_page_id = get_facebook_page_id()
    meta_token = get_meta_page_access_token()
    ig_user_id = get_instagram_business_account_id()

    try:
        if not skip_fb:
            if not facebook_page_id or not meta_token:
                result["errors"].append("facebook_credentials_missing")
            else:
                try:
                    fb_id = post_facebook_multi_photo(
                        page_id=facebook_page_id,
                        access_token=meta_token,
                        image_bytes_list=pngs,
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
                        "Posted Facebook carousel %s for %s (%s, %s slides)",
                        post_type,
                        subject_key,
                        fb_id,
                        len(pngs),
                    )
                except MetaApiError as e:
                    log.error(
                        "Facebook carousel failed for %s/%s: %s",
                        post_type,
                        subject_key,
                        e,
                    )
                    result["errors"].append(f"facebook:{e}")

        if not skip_ig:
            if not ig_user_id or not meta_token:
                result["errors"].append("instagram_credentials_missing")
            elif not PUBLIC_BASE_URL:
                result["errors"].append("public_base_url_missing")
            else:
                try:
                    image_urls: list[str] = []
                    for png in pngs:
                        jpeg = png_bytes_to_jpeg(png)
                        token = put_media(jpeg, content_type="image/jpeg")
                        media_tokens.append(token)
                        image_urls.append(_public_media_url(token))
                    ig_id = post_instagram_carousel(
                        ig_user_id=ig_user_id,
                        access_token=meta_token,
                        image_urls=image_urls,
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
                        "Posted Instagram carousel %s for %s (%s, %s slides)",
                        post_type,
                        subject_key,
                        ig_id,
                        len(pngs),
                    )
                except (MetaApiError, RuntimeError) as e:
                    log.error(
                        "Instagram carousel failed for %s/%s: %s",
                        post_type,
                        subject_key,
                        e,
                    )
                    result["errors"].append(f"instagram:{e}")
    finally:
        for token in media_tokens:
            delete_media(token)

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
    png = generate_resultados_png(
        competition_name=name,
        year=year or _year(comp),
        city_name=comp.get("city_name"),
        state_name=comp.get("state_name"),
        logo_url=comp.get("logo"),
    )
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
    png = generate_resultados_png(
        competition_name=name,
        year=year or _year(comp),
        city_name=comp.get("city_name"),
        state_name=comp.get("state_name"),
        logo_url=comp.get("logo"),
    )
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

    sentence = (
        f"{who} establece un nuevo {level_label} en {event} ({kind_label}) "
        f"con un resultado de {time_text}"
    )

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


# --- PRÓXIMAS -------------------------------------------------------------------


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
) -> str:
    name = (competition_name or "").strip() or competition_id
    date_text = format_competition_date(start_date)
    place = format_place_line(city_name, state_name)

    parts = [f"¡Próxima competencia en México! {name}"]
    if date_text:
        parts.append(f"Fecha: {date_text}")
    if place:
        parts.append(f"Lugar: {place}")
    if entry_fee:
        parts.append(f"Cuota: {entry_fee}")
    if registration_open_text and registration_close_text:
        parts.append(
            f"Inscripciones: del {registration_open_text} al {registration_close_text}"
        )
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
        parts.append(
            f"https://www.worldcubeassociation.org/competitions/{competition_id}/register"
        )
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


# --- RESUMEN ANUAL unlock -------------------------------------------------------


def is_summary_year_published(
    year: int, now: datetime | None = None
) -> bool:
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
        "Consulta tu resumen personal y el de tu team en Cubing México "
        "(inicia sesión y ábrelo desde tu menú).",
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
            skip_fb = _already_posted(
                cur, POST_TYPE_SUMMARY_UNLOCK, subject_key, "facebook"
            )
            skip_ig = _already_posted(
                cur, POST_TYPE_SUMMARY_UNLOCK, subject_key, "instagram"
            )

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
        log.info(
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). "
            "Skipping summary unlock."
        )
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


# --- SEMANA (weekly digest) -----------------------------------------------------


def get_weekly_digest_payload(week_key: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            return fetch_weekly_digest_payload(cur, week_key)


def build_weekly_digest_caption(
    payload: dict, *, include_link: bool = True
) -> str:
    week_label = payload.get("competition_week_label") or payload.get("week_key")
    parts: list[str] = [
        f"Resumen semanal Cubing México — competencias del {week_label}.",
    ]

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
            parts.append(
                f"• {h['level']} {h['event_name']} — {h['person_name']}"
            )

    sr_states = payload.get("sr_by_state") or []
    if sr_states:
        parts.append("")
        parts.append(
            "SRs por estado: "
            + ", ".join(f"{r['state_name']} {r['count']}" for r in sr_states[:5])
        )

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
            skip_fb = _already_posted(
                cur, POST_TYPE_WEEKLY_DIGEST, week_key, "facebook"
            )
            skip_ig = _already_posted(
                cur, POST_TYPE_WEEKLY_DIGEST, week_key, "instagram"
            )

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
        log.info(
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). "
            "Skipping weekly digest."
        )
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


# --- RACHAS (monthly streaks) ---------------------------------------------------


def get_streaks_monthly_payload(month_key: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            return fetch_streaks_monthly_payload(cur, month_key)


def build_streaks_monthly_caption(
    payload: dict, *, include_link: bool = True
) -> str:
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
            skip_fb = _already_posted(
                cur, POST_TYPE_STREAKS_MONTHLY, month_key, "facebook"
            )
            skip_ig = _already_posted(
                cur, POST_TYPE_STREAKS_MONTHLY, month_key, "instagram"
            )

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
        log.info(
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). "
            "Skipping monthly streaks."
        )
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
        log.exception(
            "Unhandled error posting STREAKS_MONTHLY %s: %s", month_key, e
        )
        return {
            "post_type": POST_TYPE_STREAKS_MONTHLY,
            "subject_key": month_key,
            "competition_id": None,
            "facebook": None,
            "instagram": None,
            "errors": [str(e)],
        }


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
            elif post_type == POST_TYPE_SUMMARY_UNLOCK:
                year = parse_summary_unlock_year(subject_key)
                if year is None:
                    result["errors"].append("invalid_year")
                    return result
                if not is_summary_year_published(year):
                    result["errors"].append("summary_year_not_unlocked")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_WEEKLY_DIGEST:
                if parse_iso_week_key(subject_key) is None:
                    result["errors"].append("invalid_week")
                    return result
                if not is_weekly_digest_due(subject_key):
                    result["errors"].append("weekly_digest_not_due")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_STREAKS_MONTHLY:
                if parse_month_key(subject_key) is None:
                    result["errors"].append("invalid_month")
                    return result
                if not is_streaks_monthly_due(subject_key):
                    result["errors"].append("streaks_monthly_not_due")
                    return result
                resolved_competition_id = None
            else:
                result["errors"].append("unsupported_post_type")
                return result

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

