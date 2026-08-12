"""Generate 1080x1080 RESULTADOS social graphics."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw

from social.image_common import (
    BLACK,
    GREEN,
    RED,
    SIZE,
    WHITE,
    center_text,
    layout_wrapped_name,
    load_font,
    paste_logo,
    text_height,
)

# Re-export for callers that imported from this module.
from social.image_common import png_bytes_to_jpeg  # noqa: F401

TRIANGLE = 360


def generate_resultados_png(*, competition_name: str, year: str) -> bytes:
    """Return a PNG (RGB) matching the Cubing México RESULTADOS Canva template."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    draw.polygon([(0, 0), (TRIANGLE, 0), (0, TRIANGLE)], fill=RED)
    draw.polygon(
        [(SIZE, SIZE), (SIZE - TRIANGLE, SIZE), (SIZE, SIZE - TRIANGLE)],
        fill=RED,
    )

    paste_logo(canvas, max_size=(340, 340), y=150)

    title_font = load_font(64)
    year_font = load_font(96)

    name = (competition_name or "").strip() or "México"
    year_text = (year or "").strip()
    name_font, name_lines = layout_wrapped_name(name)

    center_text(draw, "RESULTADOS", title_font, 520, BLACK)

    line_gap = max(8, int(text_height("Ay", name_font) * 0.25))
    line_height = text_height("Ay", name_font) + line_gap
    name_block_height = line_height * len(name_lines) - line_gap
    name_top = 610
    for i, line in enumerate(name_lines):
        center_text(draw, line, name_font, name_top + i * line_height, WHITE)

    if year_text:
        year_y = name_top + name_block_height + 36
        center_text(draw, year_text, year_font, year_y, WHITE)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
