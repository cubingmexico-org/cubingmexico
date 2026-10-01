"""Generate 1080x1080 NÉMESIS (nemesis-free competitor) social graphics."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    center_text,
    draw_centered_badge,
    layout_wrapped_name,
    load_font,
    paste_logo,
    text_height,
)

HEADER_H = 300


def _fmt(n: int) -> str:
    return f"{n:,}"


def generate_nemesis_png(
    *,
    person_name: str,
    event_count: int,
    nemesized_count: int,
    state_name: str | None = None,
) -> bytes:
    """Cream poster with a green header slab."""
    canvas = Image.new("RGBA", (SIZE, SIZE), CREAM)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle([0, 0, SIZE, HEADER_H], fill=GREEN)
    draw.rectangle([0, HEADER_H, SIZE, HEADER_H + 14], fill=RED)

    paste_logo(canvas, max_size=(150, 150), y=36)

    draw_centered_badge(
        draw,
        "SIN NÉMESIS",
        load_font(64),
        cy=215,
        fill=CREAM,
        text_fill=BLACK,
        pad_x=40,
        pad_y=16,
        radius=18,
    )

    center_text(draw, "NADIE LO SUPERA EN TODO", load_font(36), HEADER_H + 56, RED)

    person = (person_name or "").strip() or "Competidor"
    person_font, person_lines = layout_wrapped_name(
        person,
        max_width=SIZE - 120,
        max_size=60,
        min_size=28,
        min_single_line=44,
    )
    line_gap = max(6, int(text_height("Ay", person_font) * 0.2))
    line_height = text_height("Ay", person_font) + line_gap
    person_top = HEADER_H + 130
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

    events_label = "evento" if event_count == 1 else "eventos"
    center_text(
        draw,
        f"Nadie en México lo supera en sus {event_count} {events_label}",
        load_font(28),
        below + 14,
        BLACK,
    )

    rule_y = below + 80
    rule_w = 200
    draw.rectangle(
        [(SIZE - rule_w) // 2, rule_y, (SIZE + rule_w) // 2, rule_y + 5],
        fill=GREEN,
    )

    number_font = load_font(96)
    number_top = rule_y + 48
    center_text(draw, _fmt(nemesized_count), number_font, number_top, GREEN)
    label = "competidor lo tiene como némesis" if nemesized_count == 1 else "competidores lo tienen como némesis"
    center_text(
        draw,
        label,
        load_font(30),
        number_top + text_height("0", number_font) + 36,
        BLACK,
    )

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
