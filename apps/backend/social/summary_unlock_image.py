"""Generate 1080x1080 RESUMEN ANUAL unlock social graphics."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

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

SIDE_BAR = 56
TOP_BAR = 72
BOTTOM_BAR = 140


def _draw_pair_badges(
    draw: ImageDraw.ImageDraw,
    *,
    labels: tuple[str, str],
    font: ImageFont.ImageFont,
    cy: int,
    fill: tuple[int, int, int, int],
    text_fill: tuple[int, int, int, int],
    gap: int = 28,
    pad_x: int = 40,
    pad_y: int = 22,
    radius: int = 18,
) -> None:
    """Draw two equal badges centered as a pair on the horizontal midline."""
    boxes: list[tuple[int, int]] = []
    for label in labels:
        left, top, right, bottom = font.getbbox(label)
        boxes.append((right - left + pad_x * 2, bottom - top + pad_y * 2))

    total_w = boxes[0][0] + gap + boxes[1][0]
    x = (SIZE - total_w) // 2
    for label, (box_w, box_h) in zip(labels, boxes, strict=True):
        x0 = x
        y0 = cy - box_h // 2
        x1 = x0 + box_w
        y1 = y0 + box_h
        draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill)
        draw.text(
            ((x0 + x1) // 2, cy),
            label,
            font=font,
            fill=text_fill,
            anchor="mm",
        )
        x = x1 + gap


def generate_summary_unlock_png(*, year: int) -> bytes:
    """Cream yearbook-style unlock graphic (distinct from PRÓXIMAS band layout)."""
    canvas = Image.new("RGBA", (SIZE, SIZE), CREAM)
    draw = ImageDraw.Draw(canvas)

    # Framing: green top strip, red left rail, green bottom slab.
    draw.rectangle([0, 0, SIZE, TOP_BAR], fill=GREEN)
    draw.rectangle([0, 0, SIDE_BAR, SIZE], fill=RED)
    draw.rectangle([0, SIZE - BOTTOM_BAR, SIZE, SIZE], fill=GREEN)

    # Red wedge on the top bar (brand accent, not upcoming corner triangles).
    draw.polygon(
        [
            (SIZE - 160, 0),
            (SIZE, 0),
            (SIZE, TOP_BAR),
            (SIZE - 100, TOP_BAR),
        ],
        fill=RED,
    )

    logo_bottom = paste_logo(canvas, max_size=(200, 200), y=TOP_BAR + 48)

    eyebrow_font = load_font(28)
    center_text(
        draw,
        "CUBING MÉXICO",
        eyebrow_font,
        logo_bottom + 28,
        GREEN,
    )

    title_font = load_font(52)
    title_y = logo_bottom + 78
    center_text(draw, "RESUMEN ANUAL", title_font, title_y, RED)

    year_font = load_font(148)
    year_y = title_y + text_height("Ay", title_font) + 36
    center_text(draw, str(year), year_font, year_y, BLACK)

    rule_y = year_y + text_height("Ay", year_font) + 28
    rule_w = 280
    draw.rectangle(
        [(SIZE - rule_w) // 2, rule_y, (SIZE + rule_w) // 2, rule_y + 6],
        fill=RED,
    )

    badge_font = load_font(30)
    badge_cy = rule_y + 78
    _draw_pair_badges(
        draw,
        labels=("PERSONAL", "TEAM"),
        font=badge_font,
        cy=badge_cy,
        fill=GREEN,
        text_fill=CREAM,
    )

    footer_font = load_font(34)
    footer_ink = text_height("Ay", footer_font)
    footer_y = SIZE - BOTTOM_BAR + (BOTTOM_BAR - footer_ink) // 2
    center_text(draw, "Ya disponibles", footer_font, footer_y, WHITE)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
