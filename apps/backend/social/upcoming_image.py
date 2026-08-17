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
    text_width,
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


def format_competition_date_range(
    start: date | datetime | None,
    end: date | datetime | None = None,
) -> str:
    start_d = _as_date(start)
    if start_d is None:
        return ""
    end_d = _as_date(end)
    if end_d is None or end_d <= start_d:
        return format_competition_date(start_d)
    start_month = _MONTHS_ES[start_d.month - 1]
    end_month = _MONTHS_ES[end_d.month - 1]
    if start_d.year == end_d.year and start_d.month == end_d.month:
        return (
            f"del {start_d.day} al {end_d.day} de {start_month} de {start_d.year}"
        )
    if start_d.year == end_d.year:
        return (
            f"del {start_d.day} de {start_month} "
            f"al {end_d.day} de {end_month} de {start_d.year}"
        )
    return (
        f"del {start_d.day} de {start_month} de {start_d.year} "
        f"al {end_d.day} de {end_month} de {end_d.year}"
    )


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


DAY_MAX_WIDTH = SIZE - 160


def _day_font_for(label: str):
    preferred = 124 if "–" not in label else 96
    for size in range(preferred, 47, -4):
        font = load_font(size)
        if text_width(label, font) <= DAY_MAX_WIDTH:
            return font
    return load_font(48)


def _poster_date_labels(
    start: date, end: date | None
) -> tuple[str, str, str]:
    if end is None or end <= start:
        return (
            str(start.day),
            _MONTHS_ES_SHORT[start.month - 1],
            str(start.year),
        )
    day_label = f"{start.day}–{end.day}"
    if start.year == end.year and start.month == end.month:
        month_label = _MONTHS_ES_SHORT[start.month - 1]
        year_label = str(start.year)
    else:
        month_label = (
            f"{_MONTHS_ES_SHORT[start.month - 1]}–{_MONTHS_ES_SHORT[end.month - 1]}"
        )
        year_label = (
            str(start.year) if start.year == end.year else f"{start.year}–{end.year}"
        )
    return day_label, month_label, year_label


def generate_upcoming_png(
    *,
    competition_name: str,
    start_date: date | datetime | None,
    city_name: str,
    state_name: str | None = None,
    logo_url: str | None = None,
    end_date: date | datetime | None = None,
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

    logo_bottom = paste_logo(
        canvas, max_size=(150, 150), y=TOP_BAR + 40, logo_url=logo_url
    )

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

    start = _as_date(start_date)
    end = _as_date(end_date)
    date_block_top = rule_y + 32
    if start is not None:
        day_label, month_label, year_label = _poster_date_labels(start, end)
        day_font = _day_font_for(day_label)
        month_font = load_font(36)
        year_font = load_font(30)

        center_text(draw, day_label, day_font, date_block_top, GREEN)
        meta_y = date_block_top + text_height("Ay", day_font) + 6
        center_text(draw, month_label, month_font, meta_y, RED)
        center_text(
            draw,
            year_label,
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
