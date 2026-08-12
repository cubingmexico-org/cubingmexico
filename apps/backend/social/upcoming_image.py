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
    WHITE,
    center_text,
    draw_centered_badge,
    format_place_line,
    layout_wrapped_name,
    load_font,
    paste_logo,
    text_height,
)

TOP_BAR = 96
BOTTOM_BAR = 140

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

_MONTHS_ES_SHORT = (
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
)


def format_competition_date(start: date | datetime | None) -> str:
    if start is None:
        return ""
    if isinstance(start, datetime):
        start = start.date()
    return f"{start.day} de {_MONTHS_ES[start.month - 1]} de {start.year}"


def format_competition_datetime(value: date | datetime | None) -> str:
    """Date (and time when not midnight) in Spanish for registration windows."""
    if value is None:
        return ""
    if isinstance(value, datetime):
        date_part = format_competition_date(value)
        if value.hour or value.minute:
            return f"{date_part} a las {value.hour:02d}:{value.minute:02d}"
        return date_part
    return format_competition_date(value)


def _as_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def generate_upcoming_png(
    *,
    competition_name: str,
    start_date: date | datetime | None,
    city_name: str,
    state_name: str | None = None,
) -> bytes:
    """Ticket-style cream poster: red header band + green footer (no side rail)."""
    canvas = Image.new("RGBA", (SIZE, SIZE), CREAM)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle([0, 0, SIZE, TOP_BAR], fill=RED)
    draw.rectangle([0, SIZE - BOTTOM_BAR, SIZE, SIZE], fill=GREEN)

    # Ticket notch accents on the header.
    draw.ellipse([-28, TOP_BAR - 28, 28, TOP_BAR + 28], fill=CREAM)
    draw.ellipse([SIZE - 28, TOP_BAR - 28, SIZE + 28, TOP_BAR + 28], fill=CREAM)

    header_font = load_font(34)
    header_ink = text_height("Ay", header_font)
    center_text(
        draw,
        "PRÓXIMA COMPETENCIA",
        header_font,
        (TOP_BAR - header_ink) // 2,
        WHITE,
    )

    logo_bottom = paste_logo(canvas, max_size=(150, 150), y=TOP_BAR + 40)

    badge_font = load_font(26)
    badge_cy = logo_bottom + 48
    draw_centered_badge(
        draw,
        "AGENDA",
        badge_font,
        cy=badge_cy,
        fill=GREEN,
        text_fill=CREAM,
        pad_x=32,
        pad_y=14,
        radius=16,
    )

    name = (competition_name or "").strip() or "México"
    name_font, name_lines = layout_wrapped_name(
        name,
        max_width=SIZE - 120,
        max_size=52,
        min_size=26,
    )
    line_gap = max(6, int(text_height("Ay", name_font) * 0.2))
    line_height = text_height("Ay", name_font) + line_gap
    name_top = badge_cy + 48
    for i, line in enumerate(name_lines):
        center_text(draw, line, name_font, name_top + i * line_height, BLACK)

    rule_y = name_top + line_height * len(name_lines) + 26
    rule_w = 200
    draw.rectangle(
        [(SIZE - rule_w) // 2, rule_y, (SIZE + rule_w) // 2, rule_y + 5],
        fill=RED,
    )

    d = _as_date(start_date)
    date_block_top = rule_y + 32
    if d is not None:
        day_font = load_font(124)
        month_font = load_font(36)
        year_font = load_font(30)

        center_text(draw, str(d.day), day_font, date_block_top, GREEN)
        meta_y = date_block_top + text_height("Ay", day_font) + 6
        center_text(draw, _MONTHS_ES_SHORT[d.month - 1], month_font, meta_y, RED)
        center_text(
            draw,
            str(d.year),
            year_font,
            meta_y + text_height("Ay", month_font) + 8,
            BLACK,
        )
        place_y = (
            meta_y
            + text_height("Ay", month_font)
            + text_height("Ay", year_font)
            + 40
        )
    else:
        place_y = date_block_top + 20

    place = format_place_line(city_name, state_name)
    if place:
        place_font = load_font(30)
        max_place_y = SIZE - BOTTOM_BAR - text_height("Ay", place_font) - 28
        center_text(draw, place, place_font, min(place_y, max_place_y), BLACK)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
