"""Generate 1080x1080 RÉCORD social graphics (NR / NAR / WR)."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw

from social.image_common import (
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

TRIANGLE = 320

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
) -> bytes:
    """Red-dominant RÉCORD graphic with green corner accents."""
    canvas = Image.new("RGBA", (SIZE, SIZE), RED)
    draw = ImageDraw.Draw(canvas)

    draw.polygon([(0, 0), (TRIANGLE, 0), (0, TRIANGLE)], fill=GREEN)
    draw.polygon(
        [(SIZE, SIZE), (SIZE - TRIANGLE, SIZE), (SIZE, SIZE - TRIANGLE)],
        fill=GREEN,
    )

    paste_logo(canvas, max_size=(220, 220), y=80)

    level_key = (level or "NR").upper()
    badge = level_key if level_key in RECORD_LABELS else "NR"
    headline = RECORD_LABELS.get(badge, "RÉCORD NACIONAL")

    badge_font = load_font(88)
    badge_cy = 380
    _x0, _y0, _x1, badge_bottom = draw_centered_badge(
        draw,
        badge,
        badge_font,
        cy=badge_cy,
        fill=WHITE,
        text_fill=RED,
        pad_x=36,
        pad_y=18,
        radius=16,
    )

    title_font = load_font(36)
    center_text(draw, headline, title_font, badge_bottom + 28, WHITE)

    person = (person_name or "").strip() or "Competidor"
    person_font, person_lines = layout_wrapped_name(
        person, max_size=56, min_size=28, min_single_line=44
    )
    line_gap = max(6, int(text_height("Ay", person_font) * 0.2))
    line_height = text_height("Ay", person_font) + line_gap
    person_top = 520
    for i, line in enumerate(person_lines):
        center_text(draw, line, person_font, person_top + i * line_height, WHITE)

    below_person = person_top + line_height * len(person_lines) + 16
    state = (state_name or "").strip()
    if state:
        state_font = load_font(28)
        center_text(draw, state, state_font, below_person, WHITE)
        below_person += text_height("Ay", state_font) + 20
    else:
        below_person += 8

    event = (event_name or event_id or "").strip() or event_id
    kind_label = KIND_LABELS.get(kind, kind)
    meta = f"{event} · {kind_label}"
    meta_font = load_font(32)
    center_text(draw, meta, meta_font, below_person, WHITE)

    time_text = format_result_time(event_id, value, kind=kind)
    time_font = load_font(96)
    center_text(draw, time_text, time_font, below_person + 52, WHITE)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
