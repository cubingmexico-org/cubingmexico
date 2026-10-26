"""SEMANA PRÓXIMAS slide: upcoming competitions."""

from __future__ import annotations

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    load_font,
    text_height,
)
from social.weekly_digest.layout import (
    CONTENT_LEFT,
    CONTENT_WIDTH,
    PANEL_BOTTOM,
    PANEL_LEFT,
    PANEL_RIGHT,
    _distribute_start_and_gap,
    _draw_compact_header,
    _draw_full_header,
    _draw_section_label,
    _draw_slide_index,
    _fit_ellipsis,
    _new_canvas,
    _panel_bottom_y,
    _png_bytes,
    _wrap_text,
)
from social.weekly_digest.slide_parts import (
    _draw_thin_upcoming,
)
from social.weekly_digest.story import (
    _comp_meta,
    _upcoming_window_label,
)


def _slide_proximas(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    is_thin = bool(payload.get("is_thin"))
    upcoming = list(payload.get("upcoming_comps") or [])

    if is_thin and total <= 2:
        panel_top = _draw_full_header(canvas, draw, _upcoming_window_label(payload))
        draw.rounded_rectangle(
            [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
            radius=28,
            fill=CREAM,
        )
        _draw_thin_upcoming(draw, upcoming, panel_top=panel_top)
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    panel_top = _draw_compact_header(canvas, draw, "PRÓXIMAS")
    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    rows = upcoming[:6]
    n = max(1, len(rows))
    if n <= 1:
        section_font, name_font, meta_font = load_font(40), load_font(52), load_font(32)
    elif n <= 3:
        section_font, name_font, meta_font = load_font(30), load_font(38), load_font(26)
    else:
        section_font, name_font, meta_font = load_font(26), load_font(30), load_font(22)

    header_h = text_height("Ay", section_font) + 8 + 4 + 16
    bottom = _panel_bottom_y()
    window_label = _upcoming_window_label(payload).upper()

    if not rows:
        y = panel_top + (PANEL_BOTTOM - panel_top) // 3
        y = _draw_section_label(draw, window_label, section_font, x=CONTENT_LEFT, y=y)
        empty = load_font(28)
        draw.text(
            (CONTENT_LEFT, y),
            "Sin competencias próximas",
            font=empty,
            fill=RED,
        )
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    # Single upcoming → hero card feel, vertically centered.
    if n == 1:
        comp = rows[0]
        name_lines = _wrap_text(comp.get("name") or "", name_font, CONTENT_WIDTH, max_lines=3) or ["—"]
        meta = _comp_meta(comp)
        content_h = len(name_lines) * (text_height("Ay", name_font) + 6) + (
            text_height("Ay", meta_font) + 8 if meta else 0
        )
        y, _ = _distribute_start_and_gap(
            panel_top=panel_top,
            header_h=header_h,
            content_h=content_h,
            n_gaps=0,
            top_pad=36,
        )
        y = _draw_section_label(draw, window_label, section_font, x=CONTENT_LEFT, y=y - header_h)
        for line in name_lines:
            draw.text((CONTENT_LEFT, y), line, font=name_font, fill=BLACK)
            y += text_height("Ay", name_font) + 6
        if meta:
            y += 8
            draw.text((CONTENT_LEFT, y), meta, font=meta_font, fill=GREEN)
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    # Estimate content height for distribution.
    content_h = 0
    wrapped: list[tuple[list[str], str]] = []
    for comp in rows:
        lines = _wrap_text(comp.get("name") or "", name_font, CONTENT_WIDTH, max_lines=2) or ["—"]
        meta = _comp_meta(comp)
        wrapped.append((lines, meta))
        content_h += len(lines) * (text_height("Ay", name_font) + 2)
        if meta:
            content_h += text_height("Ay", meta_font) + 4

    y, gap = _distribute_start_and_gap(
        panel_top=panel_top,
        header_h=header_h,
        content_h=content_h,
        n_gaps=max(0, len(rows) - 1),
        min_gap=24,
        max_gap=100,
        top_pad=28,
    )
    y = _draw_section_label(draw, window_label, section_font, x=CONTENT_LEFT, y=y - header_h)

    for i, (lines, meta) in enumerate(wrapped):
        if y > bottom - 40:
            break
        for line in lines:
            draw.text((CONTENT_LEFT, y), line, font=name_font, fill=BLACK)
            y += text_height("Ay", name_font) + 2
        if meta:
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(meta, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=GREEN,
            )
            y += text_height("Ay", meta_font) + 4
        if i < len(wrapped) - 1:
            y += gap

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)
