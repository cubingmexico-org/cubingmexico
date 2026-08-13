"""Generate 1080x1080 RÉCORD social graphics (NR / NAR / WR)."""

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
    draw_centered_badge,
    format_result_time,
    layout_wrapped_name,
    load_font,
    paste_logo,
    text_height,
)

HEADER_H = 300

RECORD_LABELS = {
    "NR": "RÉCORD NACIONAL",
    "NAR": "RÉCORD NORTEAMERICANO",
    "WR": "RÉCORD MUNDIAL",
}

KIND_LABELS = {
    "single": "Single",
    "average": "Average",
}


def generate_record_png(
    *,
    person_name: str,
    event_name: str,
    event_id: str,
    kind: str,
    level: str,
    value: int,
    state_name: str | None = None,
    competition_name: str | None = None,
) -> bytes:
    """Cream poster with a bold red header slab — hero treatment for records."""
    canvas = Image.new("RGBA", (SIZE, SIZE), CREAM)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle([0, 0, SIZE, HEADER_H], fill=RED)
    # Green underline under the header.
    draw.rectangle([0, HEADER_H, SIZE, HEADER_H + 14], fill=GREEN)

    paste_logo(canvas, max_size=(150, 150), y=36)

    level_key = (level or "NR").upper()
    badge = level_key if level_key in RECORD_LABELS else "NR"
    headline = RECORD_LABELS.get(badge, "RÉCORD NACIONAL")

    badge_font = load_font(72)
    badge_cy = 210
    draw_centered_badge(
        draw,
        badge,
        badge_font,
        cy=badge_cy,
        fill=CREAM,
        text_fill=RED,
        pad_x=40,
        pad_y=16,
        radius=18,
    )

    title_font = load_font(30)
    center_text(draw, headline, title_font, HEADER_H + 40, RED)

    person = (person_name or "").strip() or "Competidor"
    person_font, person_lines = layout_wrapped_name(
        person,
        max_width=SIZE - 120,
        max_size=56,
        min_size=28,
        min_single_line=42,
    )
    line_gap = max(6, int(text_height("Ay", person_font) * 0.2))
    line_height = text_height("Ay", person_font) + line_gap
    person_top = HEADER_H + 90
    for i, line in enumerate(person_lines):
        center_text(draw, line, person_font, person_top + i * line_height, BLACK)

    below = person_top + line_height * len(person_lines) + 10
    state = (state_name or "").strip()
    if state:
        state_font = load_font(28)
        center_text(draw, state, state_font, below, GREEN)
        below += text_height("Ay", state_font) + 18
    else:
        below += 8

    event = (event_name or event_id or "").strip() or event_id
    kind_label = KIND_LABELS.get(kind, kind)
    meta = f"{event} · {kind_label}"
    meta_font = load_font(30)
    center_text(draw, meta, meta_font, below, BLACK)

    time_text = format_result_time(event_id, value, kind=kind)
    time_font = load_font(96)
    time_y = below + 48
    center_text(draw, time_text, time_font, time_y, RED)

    rule_y = time_y + text_height("Ay", time_font) + 24
    rule_w = 200
    draw.rectangle(
        [(SIZE - rule_w) // 2, rule_y, (SIZE + rule_w) // 2, rule_y + 5],
        fill=GREEN,
    )

    comp = (competition_name or "").strip()
    if comp:
        comp_font, comp_lines = layout_wrapped_name(
            comp,
            max_width=SIZE - 140,
            max_size=28,
            min_size=20,
            min_single_line=24,
        )
        comp_gap = max(4, int(text_height("Ay", comp_font) * 0.2))
        comp_line_h = text_height("Ay", comp_font) + comp_gap
        comp_top = rule_y + 28
        for i, line in enumerate(comp_lines):
            center_text(draw, line, comp_font, comp_top + i * comp_line_h, BLACK)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
