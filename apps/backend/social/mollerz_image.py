"""Generate 1080x1080 MOLLERZ membership social graphics."""

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
from social.mollerz import BLD_FMC_MEANS_EVENTS, SPEEDSOLVING_AVERAGES_EVENTS

HEADER_H = 300

# Mirrors getTierClass gradients in apps/web/lib/utils.ts: (left, right).
TIER_COLORS: dict[str, tuple[tuple, tuple]] = {
    "Bronce": ((245, 158, 11, 255), (180, 83, 9, 255)),
    "Plata": ((209, 213, 219, 255), (107, 114, 128, 255)),
    "Oro": ((250, 204, 21, 255), (202, 138, 4, 255)),
    "Platino": ((243, 244, 246, 255), (209, 213, 219, 255)),
    "Ópalo": ((96, 165, 250, 255), (244, 114, 182, 255)),
    "Diamante": ((191, 219, 254, 255), (96, 165, 250, 255)),
}
MUTED = (140, 140, 140, 255)


def _horizontal_gradient(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], left: tuple, right: tuple) -> None:
    x0, y0, x1, y1 = box
    width = max(1, x1 - x0)
    for i in range(width):
        t = i / (width - 1) if width > 1 else 0
        color = tuple(int(left[c] + (right[c] - left[c]) * t) for c in range(4))
        draw.line([(x0 + i, y0), (x0 + i, y1)], fill=color)


def _condition_lines(conditions: dict) -> list[tuple[str, bool]]:
    return [
        (
            f"Averages de speedsolving: {conditions.get('speedsolving_averages', 0)}"
            f"/{len(SPEEDSOLVING_AVERAGES_EVENTS)}",
            int(conditions.get("speedsolving_averages") or 0) == len(SPEEDSOLVING_AVERAGES_EVENTS),
        ),
        (
            f"Medias de BLD y FMC: {conditions.get('bld_fmc_means', 0)}/{len(BLD_FMC_MEANS_EVENTS)}",
            int(conditions.get("bld_fmc_means") or 0) == len(BLD_FMC_MEANS_EVENTS),
        ),
        (
            f"Eventos ganados: {conditions.get('events_won', 0)}/17",
            int(conditions.get("events_won") or 0) == 17,
        ),
        ("Récord mundial", bool(conditions.get("has_world_record"))),
        (
            "Podio en Campeonato Mundial",
            bool(conditions.get("has_world_championship_podium")),
        ),
    ]


def generate_mollerz_png(
    *,
    person_name: str,
    tier: str,
    is_new_member: bool,
    conditions: dict,
    state_name: str | None = None,
) -> bytes:
    """Cream poster with a tier-colored header slab."""
    canvas = Image.new("RGBA", (SIZE, SIZE), CREAM)
    draw = ImageDraw.Draw(canvas)

    left, right = TIER_COLORS.get(tier, TIER_COLORS["Bronce"])
    _horizontal_gradient(draw, (0, 0, SIZE, HEADER_H), left, right)
    draw.rectangle([0, HEADER_H, SIZE, HEADER_H + 14], fill=GREEN)

    paste_logo(canvas, max_size=(150, 150), y=36)

    badge_font = load_font(64)
    draw_centered_badge(
        draw,
        tier.upper(),
        badge_font,
        cy=215,
        fill=CREAM,
        text_fill=BLACK,
        pad_x=40,
        pad_y=16,
        radius=18,
    )

    headline = "NUEVO MIEMBRO MOLLERZ" if is_new_member else "NUEVO NIVEL MOLLERZ"
    center_text(draw, headline, load_font(36), HEADER_H + 56, RED)

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

    subtitle = "Compitió en todos los eventos oficiales de la WCA" if is_new_member else f"Alcanzó el nivel {tier}"
    center_text(draw, subtitle, load_font(28), below + 14, BLACK)

    rule_y = below + 80
    rule_w = 200
    draw.rectangle(
        [(SIZE - rule_w) // 2, rule_y, (SIZE + rule_w) // 2, rule_y + 5],
        fill=GREEN,
    )

    cond_font = load_font(30)
    cond_line_h = text_height("Ay", cond_font) + 34
    cond_top = rule_y + 48
    for i, (label, done) in enumerate(_condition_lines(conditions)):
        center_text(
            draw,
            label,
            cond_font,
            cond_top + i * cond_line_h,
            GREEN if done else MUTED,
        )

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()
