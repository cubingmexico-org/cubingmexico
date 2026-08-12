"""Generate 1080x1080 SEMANA weekly digest social graphics."""

from __future__ import annotations

import io
from datetime import date, datetime

from PIL import Image, ImageDraw, ImageFont

from social.calendar_mx import format_date_range_short, format_day_month_short
from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    WHITE,
    center_text,
    format_place_line,
    load_font,
    paste_logo,
    text_height,
    text_width,
)

PANEL_TOP_MIN = 210
PANEL_BOTTOM = 980
PANEL_LEFT = 56
PANEL_RIGHT = SIZE - 56
CONTENT_LEFT = PANEL_LEFT + 36
CONTENT_RIGHT = PANEL_RIGHT - 36
CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT
HEADER_TO_PANEL_GAP = 18


def _truncate(text: str, max_len: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def _fit_ellipsis(text: str, font: ImageFont.ImageFont, max_width: int) -> str:
    text = (text or "").strip()
    if not text or text_width(text, font) <= max_width:
        return text
    ell = "…"
    lo, hi = 0, len(text)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        candidate = text[:mid].rstrip() + ell
        if text_width(candidate, font) <= max_width:
            lo = mid
        else:
            hi = mid - 1
    return text[:lo].rstrip() + ell if lo else ell


def _as_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def _comp_date_line(comp: dict) -> str:
    start = _as_date(comp.get("start_date"))
    end = _as_date(comp.get("end_date"))
    if start is None:
        return ""
    if end is None or end == start:
        return format_day_month_short(start)
    return format_date_range_short(start, end)


def _upcoming_window_label(payload: dict) -> str:
    publish = _as_date(payload.get("publish_monday"))
    if publish is None:
        return "próximas 14 días"
    end = date.fromordinal(publish.toordinal() + 13)
    return format_date_range_short(publish, end)


def generate_weekly_digest_png(*, payload: dict) -> bytes:
    """Green bulletin board with a cream content panel."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    # Red top accent stripe.
    draw.rectangle([0, 0, SIZE, 28], fill=RED)

    logo_bottom = paste_logo(canvas, max_size=(110, 110), y=44)
    title_font = load_font(44)
    range_font = load_font(26)
    title_y = logo_bottom + 8
    center_text(draw, "SEMANA", title_font, title_y, WHITE)

    is_thin = bool(payload.get("is_thin"))
    subtitle = (
        _upcoming_window_label(payload)
        if is_thin
        else (payload.get("competition_week_label") or payload.get("week_key", ""))
    )
    subtitle_y = title_y + text_height("Ay", title_font) + 6
    center_text(draw, subtitle, range_font, subtitle_y, WHITE)
    panel_top = max(
        PANEL_TOP_MIN,
        subtitle_y + text_height("Ay", range_font) + HEADER_TO_PANEL_GAP,
    )

    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    section_font = load_font(26)
    body_font = load_font(24)
    small_font = load_font(22)

    y = panel_top + 28

    def section(label: str) -> None:
        nonlocal y
        if y > PANEL_BOTTOM - 48:
            return
        draw.text((CONTENT_LEFT, y), label, font=section_font, fill=GREEN)
        y += text_height("Ay", section_font) + 6

    def line(text: str, *, fill=BLACK, font=body_font) -> None:
        nonlocal y
        if y > PANEL_BOTTOM - 40:
            return
        draw.text((CONTENT_LEFT, y), _truncate(text, 40), font=font, fill=fill)
        y += text_height("Ay", font) + 4

    primary = payload.get("primary_comps") or []
    late = payload.get("late_comps") or []
    upcoming = payload.get("upcoming_comps") or []
    records = payload.get("record_counts") or {}
    sr_total = int(payload.get("sr_total") or 0)
    podium_count = int(payload.get("podium_count") or 0)
    debut_count = int(payload.get("debut_count") or 0)

    if is_thin:
        _draw_thin_upcoming(draw, upcoming, panel_top=panel_top)
    else:
        if primary or late:
            section("COMPETENCIAS")
            for comp in primary[:4]:
                flag = "" if comp.get("has_results") else " · pendientes"
                line(f"• {comp['name']}{flag}", font=small_font)
            if late:
                line("+ resultados recientes:", fill=GREEN, font=small_font)
                for comp in late[:3]:
                    line(f"• {comp['name']}", font=small_font)

        wr = int(records.get("wr") or 0)
        nar = int(records.get("nar") or 0)
        nr = int(records.get("nr") or 0)
        if wr or nar or nr or sr_total or podium_count or debut_count:
            section("EN NÚMEROS")
            bits = []
            if wr:
                bits.append(f"{wr} WR")
            if nar:
                bits.append(f"{nar} NAR")
            if nr:
                bits.append(f"{nr} NR")
            if bits:
                line(" · ".join(bits))
            if sr_total:
                line(f"{sr_total} récords estatales (SR)")
                for row in (payload.get("sr_by_state") or [])[:3]:
                    line(
                        f"  {row['state_name']}: {row['count']}",
                        font=small_font,
                    )
            if podium_count:
                line(f"{podium_count} podios")
            if debut_count:
                line(f"{debut_count} debutantes")

        highlights = payload.get("record_highlights") or []
        if highlights:
            section("DESTACADOS")
            for h in highlights[:4]:
                line(
                    f"{h['level']} · {h['person_name']} · {h['event_name']}",
                    font=small_font,
                )

        if upcoming:
            section("PRÓXIMAS")
            for comp in upcoming[:4]:
                line(f"• {comp['name']}", font=small_font)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _draw_thin_upcoming(
    draw: ImageDraw.ImageDraw,
    upcoming: list[dict],
    *,
    panel_top: int,
) -> None:
    """Fill the cream panel with a roomy upcoming list (quiet results week)."""
    rows = list(upcoming[:6])
    # Fewer comps → larger type so the panel doesn't look empty.
    if len(rows) <= 1:
        section_font = load_font(40)
        name_font = load_font(38)
        meta_font = load_font(28)
        note_font = load_font(26)
        row_gap_min = 36
    elif len(rows) <= 3:
        section_font = load_font(36)
        name_font = load_font(34)
        meta_font = load_font(26)
        note_font = load_font(24)
        row_gap_min = 28
    else:
        section_font = load_font(32)
        name_font = load_font(30)
        meta_font = load_font(24)
        note_font = load_font(22)
        row_gap_min = 20

    empty_font = load_font(28)
    note = "Sin competencias con resultados esta semana"
    header_h = (
        text_height("Ay", section_font)
        + 10
        + text_height("Ay", note_font)
        + 28
    )
    name_h = text_height("Ay", name_font)
    meta_h = text_height("Ay", meta_font)
    row_h = name_h + 8 + meta_h

    if not rows:
        y = panel_top + (PANEL_BOTTOM - panel_top - header_h - 40) // 2
        draw.text((CONTENT_LEFT, y), "PRÓXIMAS", font=section_font, fill=GREEN)
        y += text_height("Ay", section_font) + 10
        draw.text((CONTENT_LEFT, y), note, font=note_font, fill=RED)
        y += text_height("Ay", note_font) + 28
        draw.text(
            (CONTENT_LEFT, y),
            "Sin competencias próximas",
            font=empty_font,
            fill=RED,
        )
        return

    # Estimate total block height, then vertically center in the cream panel.
    list_bottom = PANEL_BOTTOM - 48
    available = list_bottom - (panel_top + 36) - header_h
    if len(rows) > 1:
        row_gap = max(
            row_gap_min,
            (available - len(rows) * row_h) // (len(rows) - 1),
        )
    else:
        row_gap = 0
    block_h = header_h + len(rows) * row_h + max(0, len(rows) - 1) * row_gap
    panel_h = PANEL_BOTTOM - panel_top
    y = panel_top + max(36, (panel_h - block_h) // 2)

    draw.text((CONTENT_LEFT, y), "PRÓXIMAS", font=section_font, fill=GREEN)
    y += text_height("Ay", section_font) + 10
    draw.text((CONTENT_LEFT, y), note, font=note_font, fill=RED)
    y += text_height("Ay", note_font) + 28

    for i, comp in enumerate(rows):
        name = _fit_ellipsis(comp.get("name") or "", name_font, CONTENT_WIDTH)
        draw.text((CONTENT_LEFT, y), name, font=name_font, fill=BLACK)
        y += name_h + 8

        date_bit = _comp_date_line(comp)
        place = format_place_line(comp.get("city_name"), comp.get("state_name"))
        meta = " · ".join(p for p in (date_bit, place) if p)
        if meta:
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(meta, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=GREEN,
            )
        y += meta_h

        if i < len(rows) - 1:
            y += row_gap
