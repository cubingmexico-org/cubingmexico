"""Shared helpers for typed social posts: post log, competition lookup, Meta publishing."""

from __future__ import annotations

import uuid

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
from social.meta import (
    MetaApiError,
    post_facebook_multi_photo,
    post_facebook_photo,
    post_instagram_carousel,
    post_instagram_image,
)
from social.resultados_image import png_bytes_to_jpeg

POST_TYPE_RESULTADOS = "resultados"
POST_TYPE_RECORD = "record"
POST_TYPE_UPCOMING = "upcoming"
POST_TYPE_SUMMARY_UNLOCK = "summary_unlock"
POST_TYPE_WEEKLY_DIGEST = "weekly_digest"
POST_TYPE_STREAKS_MONTHLY = "streaks_monthly"
POST_TYPE_MOLLERZ = "mollerz"
POST_TYPE_NEMESIS = "nemesis"
POST_TYPE_YEAR_RECAP = "year_recap"

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
        COALESCE(crd.end_date, c.start_date::date) AS competition_start_date,
        c.city_name AS competition_city_name
    FROM results r
    JOIN persons p ON p.wca_id = r.person_id
    JOIN events e ON e.id = r.event_id
    LEFT JOIN states s ON s.id = p.state_id
    LEFT JOIN competitions c ON c.id = r.competition_id
    LEFT JOIN competition_round_dates crd
      ON crd.competition_id = r.competition_id
     AND crd.event_id = r.event_id
     AND crd.round_type_id = r.round_type_id
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
        raise RuntimeError("PUBLIC_BASE_URL is required to host temporary images for Instagram")
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
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping Meta publish for %s/%s.",
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
                    log.error("Instagram post failed for %s/%s: %s", post_type, subject_key, e)
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
            "Social posts disabled (SOCIAL_POSTS_ENABLED is not true). Skipping Meta carousel publish for %s/%s.",
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
