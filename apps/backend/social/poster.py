"""Orchestrate RESULTADOS posts for newly imported Mexican competitions."""

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
from social.resultados_image import generate_resultados_png, png_bytes_to_jpeg

MX_COMPS_WITH_RESULTS_SQL = """
    SELECT DISTINCT r.competition_id
    FROM results r
    JOIN competitions c ON c.id = r.competition_id
    WHERE c.country_id = 'Mexico'
"""


def fetch_mexican_competition_ids_with_results(cur) -> set[str]:
    cur.execute(MX_COMPS_WITH_RESULTS_SQL)
    return {row.competition_id for row in cur.fetchall()}


def _already_posted(cur, competition_id: str, platform: str) -> bool:
    cur.execute(
        """
        SELECT 1 FROM social_posts
        WHERE competition_id = %s AND platform = %s
        LIMIT 1
        """,
        (competition_id, platform),
    )
    return cur.fetchone() is not None


def _record_post(cur, competition_id: str, platform: str, external_id: str | None) -> None:
    cur.execute(
        """
        INSERT INTO social_posts (id, competition_id, platform, external_id, posted_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (competition_id, platform) DO NOTHING
        """,
        (str(uuid.uuid4()), competition_id, platform, external_id),
    )


def _competition_details(cur, competition_id: str) -> dict | None:
    cur.execute(
        """
        SELECT
            c.id,
            c.name,
            c.city_name,
            c.start_date,
            s.name AS state_name
        FROM competitions c
        LEFT JOIN states s ON s.id = c.state_id
        WHERE c.id = %s AND c.country_id = 'Mexico'
        """,
        (competition_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    return {
        "id": row.id,
        "name": row.name,
        "city_name": row.city_name,
        "start_date": row.start_date,
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


def _caption(comp: dict, *, include_link: bool = True) -> str:
    return build_resultados_caption(
        competition_name=comp.get("name") or "",
        competition_id=comp["id"],
        include_link=include_link,
    )


def get_competition_resultados_captions(competition_id: str) -> dict[str, str] | None:
    """Return facebook/instagram captions for a Mexican competition, or None."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
    if not comp:
        return None
    return {
        "facebook": _caption(comp, include_link=True),
        "instagram": _caption(comp, include_link=False),
    }


def get_competition_resultados_caption(
    competition_id: str,
    *,
    include_link: bool = True,
) -> str | None:
    """Return caption text for a Mexican competition, or None if not found."""
    captions = get_competition_resultados_captions(competition_id)
    if not captions:
        return None
    return captions["facebook"] if include_link else captions["instagram"]


def _public_media_url(token: str) -> str:
    base = (PUBLIC_BASE_URL or "").rstrip("/")
    if not base:
        raise RuntimeError(
            "PUBLIC_BASE_URL is required to host temporary images for Instagram"
        )
    # Instagram Content Publishing requires JPEG (not PNG).
    return f"{base}/social/media/{token}.jpg"


def generate_competition_resultados_png(competition_id: str) -> tuple[bytes, dict] | None:
    """Return (png_bytes, competition_details) for a Mexican competition, or None."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
    if not comp:
        return None
    name, year = _display_name_and_year(comp)
    png = generate_resultados_png(
        competition_name=name,
        year=year,
    )
    return png, comp


def post_competition_resultados(competition_id: str) -> dict:
    """Generate and post RESULTADOS for one Mexican competition. Best-effort per platform.

    Intended for both auto-sync and manual admin retries. Ignores SOCIAL_POSTS_ENABLED;
    callers that gate on the kill switch should check it themselves.
    """
    result = {"competition_id": competition_id, "facebook": None, "instagram": None, "errors": []}

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
            if not comp:
                result["errors"].append("competition_not_found_or_not_mexico")
                return result

            skip_fb = _already_posted(cur, competition_id, "facebook")
            skip_ig = _already_posted(cur, competition_id, "instagram")

    if skip_fb and skip_ig:
        log.info("Skipping %s — already posted to facebook and instagram", competition_id)
        result["facebook"] = "already_posted"
        result["instagram"] = "already_posted"
        return result

    name, year = _display_name_and_year(comp)
    png = generate_resultados_png(
        competition_name=name,
        year=year,
    )
    facebook_caption = _caption(comp, include_link=True)
    instagram_caption = _caption(comp, include_link=False)
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
                            _record_post(cur, competition_id, "facebook", fb_id)
                    result["facebook"] = fb_id
                    log.info("Posted Facebook RESULTADOS for %s (%s)", competition_id, fb_id)
                except MetaApiError as e:
                    log.error("Facebook post failed for %s: %s", competition_id, e)
                    result["errors"].append(f"facebook:{e}")

        if not skip_ig:
            if not ig_user_id or not meta_token:
                result["errors"].append("instagram_credentials_missing")
            elif not PUBLIC_BASE_URL:
                result["errors"].append("public_base_url_missing")
            else:
                try:
                    # Meta fetches image_url from any Cloud Run replica; store in DB.
                    # IG image_url must be JPEG per Graph API image specifications.
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
                            _record_post(cur, competition_id, "instagram", ig_id)
                    result["instagram"] = ig_id
                    log.info("Posted Instagram RESULTADOS for %s (%s)", competition_id, ig_id)
                except (MetaApiError, RuntimeError) as e:
                    log.error("Instagram post failed for %s: %s", competition_id, e)
                    result["errors"].append(f"instagram:{e}")
    finally:
        if media_token:
            delete_media(media_token)

    return result


def mark_competition_posted(
    competition_id: str,
    platforms: Iterable[str] | None = None,
    *,
    external_id: str = "manual",
) -> dict:
    """Record social_posts rows without calling Meta (after a manual publish)."""
    wanted = {p.lower() for p in (platforms or ("facebook", "instagram"))}
    wanted &= {"facebook", "instagram"}
    result = {
        "competition_id": competition_id,
        "marked": [],
        "skipped": [],
        "errors": [],
    }

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            comp = _competition_details(cur, competition_id)
            if not comp:
                result["errors"].append("competition_not_found_or_not_mexico")
                return result

            for platform in sorted(wanted):
                if _already_posted(cur, competition_id, platform):
                    result["skipped"].append(platform)
                    continue
                _record_post(cur, competition_id, platform, external_id)
                result["marked"].append(platform)

    return result


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
                    "competition_id": competition_id,
                    "facebook": None,
                    "instagram": None,
                    "errors": [str(e)],
                }
            )
    return results
