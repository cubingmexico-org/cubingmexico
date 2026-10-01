"""RESULTADOS posts: competition results now available."""

from __future__ import annotations

from typing import Iterable

import psycopg2.extras

from common import SOCIAL_POSTS_ENABLED, get_connection, log
from social.poster.mark import mark_typed_posted
from social.poster.shared import (
    POST_TYPE_RESULTADOS,
    _already_posted,
    _competition_details,
    _display_name_and_year,
    _publish_image_to_platforms,
    _year,
)
from social.resultados_image import generate_resultados_png


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
        parts.append(f"https://cubingmexico.net/competitions/{competition_id}/results/podiums")
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

            skip_fb = _already_posted(cur, POST_TYPE_RESULTADOS, competition_id, "facebook")
            skip_ig = _already_posted(cur, POST_TYPE_RESULTADOS, competition_id, "instagram")

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
