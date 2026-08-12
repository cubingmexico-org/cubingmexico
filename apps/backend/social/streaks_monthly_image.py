"""Generate 1080x1080 RACHAS monthly streak leaderboard graphics."""

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
    load_font,
    paste_logo,
    text_height,
)

RIGHT_RAIL = 56
BOTTOM_BAR = 110


def _truncate(text: str, max_len: int) -> str:
    text = (text or "").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


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

    logo_bottom = paste_logo(canvas, max_size=(140, 140), y=90)

    title_font = load_font(52)
    month_font = load_font(32)
    row_font = load_font(28)
    meta_font = load_font(24)
    callout_font = load_font(26)

    y = logo_bottom + 20
    center_text(draw, "RACHAS", title_font, y, RED)
    y += text_height("Ay", title_font) + 8
    center_text(
        draw,
        payload.get("month_label") or payload.get("month_key", ""),
        month_font,
        y,
        BLACK,
    )
    y += text_height("Ay", month_font) + 24

    center_text(draw, "Top rachas actuales", meta_font, y, GREEN)
    y += text_height("Ay", meta_font) + 16

    left = 64
    right = SIZE - RIGHT_RAIL - 48
    for i, row in enumerate(payload.get("top_current") or [], start=1):
        name = _truncate(row.get("person_name") or "", 26)
        state = (row.get("state_name") or "").strip()
        streak = int(row.get("current_streak") or 0)
        draw.text((left, y), f"{i}. {name}", font=row_font, fill=BLACK)
        draw.text((right, y), f"{streak}", font=row_font, fill=RED, anchor="ra")
        y += text_height("Ay", row_font) + 2
        if state:
            draw.text((left + 28, y), state, font=meta_font, fill=GREEN)
            y += text_height("Ay", meta_font) + 10
        else:
            y += 10

    callout = payload.get("longest_callout")
    if callout:
        y += 8
        rule_w = 260
        draw.rectangle(
            [(SIZE - RIGHT_RAIL - rule_w) // 2, y, (SIZE - RIGHT_RAIL + rule_w) // 2, y + 4],
            fill=RED,
        )
        y += 18
        center_text(
            draw,
            f"Récord histórico: {_truncate(callout.get('person_name') or '', 24)}",
            callout_font,
            y,
            BLACK,
        )
        y += text_height("Ay", callout_font) + 6
        center_text(
            draw,
            f"{int(callout.get('longest_streak') or 0)} competencias",
            meta_font,
            y,
            GREEN,
        )

    footer_font = load_font(28)
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
