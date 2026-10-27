"""Entry points for the SEMANA weekly digest slides; each slide lives in a `slides_*` module."""

from __future__ import annotations

from social.weekly_digest.slides_people import _slide_debutantes, _slide_destacados
from social.weekly_digest.slides_upcoming import _slide_proximas
from social.weekly_digest.slides_week import _slide_competencias, _slide_cover, _slide_numeros
from social.weekly_digest.story import SLIDE_TITLES, _plan_ids


def generate_weekly_digest_slides(*, payload: dict) -> list[dict]:
    """Generate all slides: [{id, title, png}]."""
    ids, footer_slide = _plan_ids(payload)
    payload = {**payload, "_upcoming_footer_slide": footer_slide}
    plan = [{"id": slide_id, "title": SLIDE_TITLES[slide_id]} for slide_id in ids]
    out: list[dict] = []
    total = len(plan)
    for i, slide in enumerate(plan):
        png = _render_slide(
            payload,
            slide_id=slide["id"],
            index=i,
            total=total,
        )
        out.append({"id": slide["id"], "title": slide["title"], "png": png})
    return out


def generate_weekly_digest_png(*, payload: dict) -> bytes:
    """Compat: first slide only (cover / first planned slide)."""
    slides = generate_weekly_digest_slides(payload=payload)
    if slides:
        return slides[0]["png"]
    # Empty fallback — solid green with SEMANA header.
    return _render_slide(payload, slide_id="cover", index=0, total=1)


def _render_slide(
    payload: dict,
    *,
    slide_id: str,
    index: int,
    total: int,
) -> bytes:
    if slide_id == "cover":
        return _slide_cover(payload, index=index, total=total)
    if slide_id == "competencias":
        return _slide_competencias(payload, index=index, total=total)
    if slide_id == "numeros":
        return _slide_numeros(payload, index=index, total=total)
    if slide_id == "debutantes":
        return _slide_debutantes(payload, index=index, total=total)
    if slide_id == "destacados":
        return _slide_destacados(payload, index=index, total=total)
    if slide_id == "proximas":
        return _slide_proximas(payload, index=index, total=total)
    return _slide_cover(payload, index=index, total=total)
