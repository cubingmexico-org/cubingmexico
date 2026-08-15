"""Generate 1080x1080 RESULTADOS social graphics."""

from __future__ import annotations

import io
import re

from PIL import Image, ImageDraw

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    center_text,
    draw_centered_badge,
    format_place_line,
    layout_wrapped_name,
    load_font,
    paste_logo,
    text_height,
)

# Re-export for callers that imported from this module.
from social.image_common import png_bytes_to_jpeg  # noqa: F401

_TRAILING_YEAR = re.compile(r"\s+(19|20)\d{2}$")

CARD_MARGIN = 72
CARD_RADIUS = 36
CORNER = 280


def _split_name_and_year(competition_name: str, year: str) -> tuple[str, str]:
    """Prefer an explicit year; otherwise peel a trailing year off the title."""
    name = (competition_name or "").strip() or "México"
    year_text = (year or "").strip()

    if year_text and name.endswith(year_text):
        name = name[: -len(year_text)].strip(" -–—")
        return name or "México", year_text

    if not year_text:
        match = _TRAILING_YEAR.search(name)
        if match:
            year_text = match.group(0).strip()
            name = name[: match.start()].strip(" -–—") or "México"

    return name, year_text


def generate_resultados_png(
    *,
    competition_name: str,
    year: str,
    city_name: str | None = None,
    state_name: str | None = None,
    logo_url: str | None = None,
) -> bytes:
    """Green field with a floating cream card — distinct from rail-frame posters."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    # Red corner wedges on the green field.
    draw.polygon([(0, 0), (CORNER, 0), (0, CORNER)], fill=RED)
    draw.polygon(
        [(SIZE, SIZE), (SIZE - CORNER, SIZE), (SIZE, SIZE - CORNER)],
        fill=RED,
    )

    card = [CARD_MARGIN, CARD_MARGIN + 24, SIZE - CARD_MARGIN, SIZE - CARD_MARGIN - 24]
    draw.rounded_rectangle(card, radius=CARD_RADIUS, fill=CREAM)

    name, year_text = _split_name_and_year(competition_name, year)
    place = format_place_line(city_name, state_name)

    inner_w = SIZE - CARD_MARGIN * 2 - 64
    logo_bottom = paste_logo(
        canvas, max_size=(170, 170), y=card[1] + 36, logo_url=logo_url
    )

    badge_font = load_font(28)
    badge_cy = logo_bottom + 48
    draw_centered_badge(
        draw,
        "RESULTADOS",
        badge_font,
        cy=badge_cy,
        fill=GREEN,
        text_fill=CREAM,
        pad_x=40,
        pad_y=16,
        radius=18,
    )

    name_font, name_lines = layout_wrapped_name(
        name,
        max_width=inner_w,
        max_size=58,
        min_size=28,
    )
    line_gap = max(6, int(text_height("Ay", name_font) * 0.2))
    line_h = text_height("Ay", name_font) + line_gap
    name_top = badge_cy + 52
    for i, line in enumerate(name_lines):
        center_text(draw, line, name_font, name_top + i * line_h, BLACK)

    rule_y = name_top + line_h * len(name_lines) + 28
    rule_w = 220
    draw.rectangle(
        [(SIZE - rule_w) // 2, rule_y, (SIZE + rule_w) // 2, rule_y + 5],
        fill=RED,
    )

    y = rule_y + 36
    if year_text:
        year_font = load_font(120)
        center_text(draw, year_text, year_font, y, GREEN)
        y += text_height("Ay", year_font) + 22

    if place:
        place_font = load_font(30)
        center_text(draw, place, place_font, y, BLACK)
        y += text_height("Ay", place_font) + 22

    avail_font = load_font(32)
    center_text(draw, "Ya disponibles", avail_font, y, RED)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
