"""Shared layout constants and drawing primitives for SEMANA digest slides."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

from social.image_common import (
    CREAM,
    GREEN,
    RED,
    SIZE,
    WHITE,
    center_text,
    load_font,
    paste_logo,
    text_height,
    text_width,
)

PANEL_TOP_FULL = 210


PANEL_TOP_COMPACT = 150


PANEL_BOTTOM = 980


PANEL_LEFT = 56


PANEL_RIGHT = SIZE - 56


CONTENT_LEFT = PANEL_LEFT + 36


CONTENT_RIGHT = PANEL_RIGHT - 36


CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT


HEADER_TO_PANEL_GAP = 18


FOOTER_RESERVE = 36


TILE_BG = (0, 104, 71, 255)


TILE_LABEL = (245, 240, 230, 220)


RULE = (206, 17, 38, 255)


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


def _panel_bottom_y() -> int:
    return PANEL_BOTTOM - FOOTER_RESERVE


def _distribute_start_and_gap(
    *,
    panel_top: int,
    header_h: int,
    content_h: int,
    n_gaps: int,
    min_gap: int = 16,
    max_gap: int = 120,
    top_pad: int = 28,
    bottom: int | None = None,
) -> tuple[int, int]:
    """Return (y_start_after_header, gap) to vertically fill the cream panel.

    y_start_after_header is where content begins (caller draws section label
    starting at y_start_after_header - header_h).
    """
    if bottom is None:
        bottom = _panel_bottom_y()
    available = bottom - (panel_top + top_pad) - header_h
    if available < 1:
        return panel_top + top_pad + header_h, min_gap
    if n_gaps <= 0:
        leftover = max(0, available - content_h)
        return panel_top + top_pad + header_h + leftover // 2, 0
    raw_gap = (available - content_h) // n_gaps
    gap = max(min_gap, min(max_gap, raw_gap))
    used = content_h + n_gaps * gap
    leftover = max(0, available - used)
    y = panel_top + top_pad + header_h + leftover // 2
    return y, gap


def _wrap_text(text: str, font: ImageFont.ImageFont, max_width: int, *, max_lines: int = 2) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_width(candidate, font) <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = word
        if len(lines) >= max_lines:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    elif current and lines:
        lines[-1] = _fit_ellipsis(f"{lines[-1]} {current}".strip(), font, max_width)
    fitted = [_fit_ellipsis(line, font, max_width) for line in lines[:max_lines]]
    return [line for line in fitted if line]


def _draw_section_label(
    draw: ImageDraw.ImageDraw,
    label: str,
    font: ImageFont.ImageFont,
    *,
    x: int,
    y: int,
) -> int:
    draw.text((x, y), label, font=font, fill=GREEN)
    y += text_height("Ay", font) + 8
    draw.rectangle([x, y, x + 48, y + 4], fill=RULE)
    return y + 16


def _draw_stat_tiles(
    draw: ImageDraw.ImageDraw,
    tiles: list[tuple[str, str]],
    *,
    x0: int,
    x1: int,
    y: int,
    tile_h: int = 120,
    num_size: int = 44,
) -> int:
    if not tiles:
        return y
    gap = 14
    n = len(tiles)
    width = x1 - x0
    tile_w = (width - gap * (n - 1)) // n
    num_font = load_font(num_size)
    label_font = load_font(20)

    for i, (value, label) in enumerate(tiles):
        tx0 = x0 + i * (tile_w + gap)
        tx1 = tx0 + tile_w
        draw.rounded_rectangle([tx0, y, tx1, y + tile_h], radius=18, fill=TILE_BG)
        cx = (tx0 + tx1) // 2
        draw.text((cx, y + tile_h * 0.38), value, font=num_font, fill=CREAM, anchor="mm")
        draw.text(
            (cx, y + tile_h * 0.72),
            label.upper(),
            font=label_font,
            fill=TILE_LABEL,
            anchor="mm",
        )
    return y + tile_h + 18


def _draw_level_badge(
    draw: ImageDraw.ImageDraw,
    level: str,
    font: ImageFont.ImageFont,
    *,
    x: int,
    cy: int,
) -> int:
    label = (level or "").strip().upper() or "?"
    fill = RED if label in {"WR", "NAR", "NR"} else GREEN
    left, top, right, bottom = font.getbbox(label)
    pad_x, pad_y = 12, 8
    box_w = (right - left) + pad_x * 2
    box_h = (bottom - top) + pad_y * 2
    x0 = x
    y0 = cy - box_h // 2
    draw.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h], radius=10, fill=fill)
    draw.text((x0 + box_w // 2, cy), label, font=font, fill=CREAM, anchor="mm")
    return x0 + box_w


def _draw_slide_index(draw: ImageDraw.ImageDraw, *, index: int, total: int) -> None:
    if total <= 1:
        return
    font = load_font(22)
    label = f"{index + 1}/{total}"
    draw.text(
        (SIZE // 2, PANEL_BOTTOM + 18),
        label,
        font=font,
        fill=WHITE,
        anchor="mt",
    )


def _new_canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, 0, SIZE, 28], fill=RED)
    return canvas, draw


def _draw_full_header(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    subtitle: str,
    *,
    title: str = "SEMANA",
) -> int:
    """Full SEMANA header. Returns panel_top."""
    logo_bottom = paste_logo(canvas, max_size=(110, 110), y=44)
    title_font = load_font(44)
    range_font = load_font(26)
    title_y = logo_bottom + 8
    center_text(draw, title, title_font, title_y, WHITE)
    subtitle_y = title_y + text_height("Ay", title_font) + 6
    center_text(draw, subtitle, range_font, subtitle_y, WHITE)
    return max(
        PANEL_TOP_FULL,
        subtitle_y + text_height("Ay", range_font) + HEADER_TO_PANEL_GAP,
    )


def _draw_compact_header(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    eyebrow: str,
    *,
    title: str = "SEMANA",
) -> int:
    """Compact header band for inner slides. Returns panel_top."""
    logo_bottom = paste_logo(canvas, max_size=(72, 72), y=40)
    eyebrow_font = load_font(24)
    title_font = load_font(36)
    ey = logo_bottom + 4
    center_text(draw, title, eyebrow_font, ey, WHITE)
    ty = ey + text_height("Ay", eyebrow_font) + 4
    center_text(draw, eyebrow, title_font, ty, WHITE)
    return max(
        PANEL_TOP_COMPACT,
        ty + text_height("Ay", title_font) + HEADER_TO_PANEL_GAP,
    )


def _png_bytes(canvas: Image.Image) -> bytes:
    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _fit_headline(text: str, max_width: int, *, sizes: tuple[int, ...]) -> tuple[ImageFont.ImageFont, list[str]]:
    """Largest size that wraps into two lines without truncation (else 3 lines)."""
    text = (text or "").strip() or "—"
    for size in sizes:
        font = load_font(size)
        lines = _wrap_text(text, font, max_width, max_lines=2)
        if lines and " ".join(lines) == " ".join(text.split()):
            return font, lines
    font = load_font(sizes[-1])
    return font, _wrap_text(text, font, max_width, max_lines=3) or [text]
