"""Generate 1080x1080 SEMANA weekly digest social graphics."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    WHITE,
    center_text,
    load_font,
    paste_logo,
    text_height,
)

PANEL_TOP = 210
PANEL_BOTTOM = 980
PANEL_LEFT = 56
PANEL_RIGHT = SIZE - 56
CONTENT_LEFT = PANEL_LEFT + 36


def _truncate(text: str, max_len: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def generate_weekly_digest_png(*, payload: dict) -> bytes:
    """Green bulletin board with a cream content panel."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    # Red top accent stripe.
    draw.rectangle([0, 0, SIZE, 28], fill=RED)

    logo_bottom = paste_logo(canvas, max_size=(110, 110), y=44)
    title_font = load_font(44)
    range_font = load_font(26)
    center_text(draw, "SEMANA", title_font, logo_bottom + 8, WHITE)
    center_text(
        draw,
        payload.get("competition_week_label") or payload.get("week_key", ""),
        range_font,
        logo_bottom + 8 + text_height("Ay", title_font) + 6,
        CREAM,
    )

    draw.rounded_rectangle(
        [PANEL_LEFT, PANEL_TOP, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    section_font = load_font(26)
    body_font = load_font(24)
    small_font = load_font(22)

    y = PANEL_TOP + 28

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

    if payload.get("is_thin"):
        section("PRÓXIMAS")
        for comp in upcoming[:6]:
            line(comp["name"], font=small_font)
        if not upcoming:
            line("Sin competencias próximas", fill=RED)
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
