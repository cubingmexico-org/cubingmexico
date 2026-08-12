"""Generate 1080x1080 RACHAS monthly streak leaderboard graphics."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    center_text,
    load_font,
    paste_logo,
    text_height,
    text_width,
)

RIGHT_RAIL = 56
BOTTOM_BAR = 110
SCORE_GUTTER = 120


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


def generate_streaks_monthly_png(*, payload: dict) -> bytes:
    """Cream leaderboard with right red rail and stacked green top rules."""
    canvas = Image.new("RGBA", (SIZE, SIZE), CREAM)
    draw = ImageDraw.Draw(canvas)

    # Stacked green rules instead of a solid header bar.
    for i, thickness in enumerate((10, 6, 3)):
        y0 = 28 + i * 18
        draw.rectangle([48, y0, SIZE - RIGHT_RAIL - 48, y0 + thickness], fill=GREEN)

    draw.rectangle([SIZE - RIGHT_RAIL, 0, SIZE, SIZE], fill=RED)
    draw.rectangle([0, SIZE - BOTTOM_BAR, SIZE - RIGHT_RAIL, SIZE], fill=GREEN)

    logo_bottom = paste_logo(canvas, max_size=(120, 120), y=88)

    title_font = load_font(56)
    month_font = load_font(36)
    section_font = load_font(30)
    row_font = load_font(38)
    score_font = load_font(48)
    state_font = load_font(26)

    y = logo_bottom + 16
    center_text(draw, "RACHAS", title_font, y, RED)
    y += text_height("Ay", title_font) + 10
    center_text(
        draw,
        payload.get("month_label") or payload.get("month_key", ""),
        month_font,
        y,
        BLACK,
    )
    y += text_height("Ay", month_font) + 28

    center_text(draw, "Top rachas actuales", section_font, y, GREEN)
    y += text_height("Ay", section_font) + 8

    rows = list(payload.get("top_current") or [])
    left = 64
    right = SIZE - RIGHT_RAIL - 48
    name_max_w = right - left - SCORE_GUTTER

    # Spread rows through the remaining cream area so the board isn't top-heavy.
    list_top = y + 20
    list_bottom = SIZE - BOTTOM_BAR - 36
    row_gap = 28
    if rows:
        sample_h = text_height("Ay", row_font) + 6 + text_height("Ay", state_font)
        content_h = len(rows) * sample_h
        free = list_bottom - list_top - content_h
        if free > 0 and len(rows) > 1:
            row_gap = max(28, free // (len(rows) - 1))

    y = list_top
    for i, row in enumerate(rows, start=1):
        prefix = f"{i}. "
        prefix_w = text_width(prefix, row_font)
        name = _fit_ellipsis(
            row.get("person_name") or "", row_font, name_max_w - prefix_w
        )
        state = (row.get("state_name") or "").strip()
        streak = int(row.get("current_streak") or 0)
        name_h = text_height("Ay", row_font)
        mid_y = y + name_h // 2
        draw.text((left, mid_y), f"{prefix}{name}", font=row_font, fill=BLACK, anchor="lm")
        draw.text((right, mid_y), f"{streak}", font=score_font, fill=RED, anchor="rm")
        y += name_h + 6
        if state:
            draw.text(
                (left + prefix_w, y),
                _fit_ellipsis(state, state_font, name_max_w - prefix_w),
                font=state_font,
                fill=GREEN,
            )
            y += text_height("Ay", state_font)
        if i < len(rows):
            y += row_gap

    footer_font = load_font(30)
    footer_ink = text_height("Ay", footer_font)
    footer_y = SIZE - BOTTOM_BAR + (BOTTOM_BAR - footer_ink) // 2
    # Offset center slightly left of the red rail.
    draw.text(
        ((SIZE - RIGHT_RAIL) // 2, footer_y),
        "cubingmexico.net/streaks",
        font=footer_font,
        fill=(255, 255, 255, 255),
        anchor="mt",
    )

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
