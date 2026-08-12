"""Generate 1080x1080 PRÓXIMA social graphics for upcoming competitions."""

from __future__ import annotations

import io
from datetime import date, datetime

from PIL import Image, ImageDraw

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    center_text,
    format_place_line,
    layout_wrapped_name,
    load_font,
    paste_logo,
    text_height,
)

TRIANGLE = 220
BAND_TOP = 420
BAND_BOTTOM = 900

_MONTHS_ES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def format_competition_date(start: date | datetime | None) -> str:
    if start is None:
        return ""
    if isinstance(start, datetime):
        start = start.date()
    return f"{start.day} de {_MONTHS_ES[start.month - 1]} de {start.year}"


def generate_upcoming_png(
    *,
    competition_name: str,
    start_date: date | datetime | None,
    city_name: str,
    state_name: str | None = None,
) -> bytes:
    """Green field with cream content band for upcoming MX competitions."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    draw.polygon([(0, 0), (TRIANGLE, 0), (0, TRIANGLE)], fill=RED)
    draw.polygon(
        [(SIZE, 0), (SIZE - TRIANGLE, 0), (SIZE, TRIANGLE)],
        fill=RED,
    )
    draw.rectangle([0, BAND_TOP, SIZE, BAND_BOTTOM], fill=CREAM)

    paste_logo(canvas, max_size=(260, 260), y=90)

    title_font = load_font(56)
    center_text(draw, "PRÓXIMA", title_font, BAND_TOP + 36, RED)

    name = (competition_name or "").strip() or "México"
    name_font, name_lines = layout_wrapped_name(name, max_size=52, min_size=28)
    line_gap = max(6, int(text_height("Ay", name_font) * 0.22))
    line_height = text_height("Ay", name_font) + line_gap
    name_top = BAND_TOP + 120
    for i, line in enumerate(name_lines):
        center_text(draw, line, name_font, name_top + i * line_height, BLACK)

    date_text = format_competition_date(start_date)
    date_font = load_font(40)
    date_y = name_top + line_height * len(name_lines) + 36
    if date_text:
        center_text(draw, date_text, date_font, date_y, GREEN)

    place = format_place_line(city_name, state_name)
    if place:
        place_font = load_font(32)
        center_text(draw, place, place_font, date_y + 64, BLACK)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
