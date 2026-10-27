"""Pieces shared by several SEMANA slides: the PRÓXIMAS footer strip and upcoming lists."""

from __future__ import annotations

from PIL import ImageDraw

from social.image_common import (
    BLACK,
    GREEN,
    RED,
    Font,
    load_font,
    text_height,
)
from social.weekly_digest.layout import (
    CONTENT_LEFT,
    CONTENT_RIGHT,
    CONTENT_WIDTH,
    PANEL_BOTTOM,
    TILE_BG,
    _fit_ellipsis,
    _panel_bottom_y,
    _wrap_text,
)
from social.weekly_digest.story import (
    _comp_meta,
)

UPCOMING_FOOTER_ROW_H = 64


UPCOMING_FOOTER_HEAD_H = 52


def _upcoming_footer_height(payload: dict) -> int:
    rows = (payload.get("upcoming_comps") or [])[:2]
    if not rows:
        return 0
    return UPCOMING_FOOTER_HEAD_H + len(rows) * UPCOMING_FOOTER_ROW_H + 12


def _content_bottom(payload: dict, slide_id: str) -> int:
    """Lowest y for slide content, leaving room for the PRÓXIMAS footer strip."""
    bottom = _panel_bottom_y()
    if payload.get("_upcoming_footer_slide") == slide_id:
        bottom -= _upcoming_footer_height(payload) + 24
    return bottom


def _draw_upcoming_footer(draw: ImageDraw.ImageDraw, payload: dict, slide_id: str) -> None:
    if payload.get("_upcoming_footer_slide") != slide_id:
        return
    rows = (payload.get("upcoming_comps") or [])[:2]
    if not rows:
        return
    label_font = load_font(22)
    name_font = load_font(26)
    meta_font = load_font(20)
    top = _panel_bottom_y() - _upcoming_footer_height(payload)
    draw.line([(CONTENT_LEFT, top), (CONTENT_RIGHT, top)], fill=TILE_BG, width=2)
    y = top + 16
    draw.text((CONTENT_LEFT, y), "PRÓXIMAS", font=label_font, fill=RED)
    y = top + UPCOMING_FOOTER_HEAD_H
    for comp in rows:
        draw.text(
            (CONTENT_LEFT, y),
            _fit_ellipsis(comp.get("name") or "", name_font, CONTENT_WIDTH),
            font=name_font,
            fill=BLACK,
        )
        meta = _comp_meta(comp)
        if meta:
            draw.text(
                (CONTENT_LEFT, y + text_height("Ay", name_font) + 8),
                _fit_ellipsis(meta, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=GREEN,
            )
        y += UPCOMING_FOOTER_ROW_H


def _estimate_comp_block_h(
    rows: list[tuple[dict, str | None]],
    *,
    name_font: Font,
    meta_font: Font,
) -> int:
    h = 0
    for comp, _tag in rows:
        lines = _wrap_text(comp.get("name") or "", name_font, CONTENT_WIDTH - 110, max_lines=2) or ["—"]
        h += len(lines) * (text_height("Ay", name_font) + 2)
        if _comp_meta(comp):
            h += text_height("Ay", meta_font) + 4
        h += 8
    return h


def _draw_thin_upcoming(
    draw: ImageDraw.ImageDraw,
    upcoming: list[dict],
    *,
    panel_top: int,
) -> None:
    """Fill the cream panel with a roomy upcoming list (quiet results week)."""
    rows = list(upcoming[:6])
    if len(rows) <= 1:
        section_font = load_font(40)
        name_font = load_font(38)
        meta_font = load_font(28)
        note_font = load_font(26)
        row_gap_min = 36
    elif len(rows) <= 3:
        section_font = load_font(36)
        name_font = load_font(34)
        meta_font = load_font(26)
        note_font = load_font(24)
        row_gap_min = 28
    else:
        section_font = load_font(32)
        name_font = load_font(30)
        meta_font = load_font(24)
        note_font = load_font(22)
        row_gap_min = 20

    empty_font = load_font(28)
    note = "Sin competencias con resultados esta semana"
    header_h = text_height("Ay", section_font) + 10 + text_height("Ay", note_font) + 28
    name_h = text_height("Ay", name_font)
    meta_h = text_height("Ay", meta_font)
    row_h = name_h + 8 + meta_h

    if not rows:
        y = panel_top + (PANEL_BOTTOM - panel_top - header_h - 40) // 2
        draw.text((CONTENT_LEFT, y), "PRÓXIMAS", font=section_font, fill=GREEN)
        y += text_height("Ay", section_font) + 10
        draw.text((CONTENT_LEFT, y), note, font=note_font, fill=RED)
        y += text_height("Ay", note_font) + 28
        draw.text(
            (CONTENT_LEFT, y),
            "Sin competencias próximas",
            font=empty_font,
            fill=RED,
        )
        return

    list_bottom = PANEL_BOTTOM - 48
    available = list_bottom - (panel_top + 36) - header_h
    row_gap = max(row_gap_min, (available - len(rows) * row_h) // (len(rows) - 1)) if len(rows) > 1 else 0
    block_h = header_h + len(rows) * row_h + max(0, len(rows) - 1) * row_gap
    panel_h = PANEL_BOTTOM - panel_top
    y = panel_top + max(36, (panel_h - block_h) // 2)

    draw.text((CONTENT_LEFT, y), "PRÓXIMAS", font=section_font, fill=GREEN)
    y += text_height("Ay", section_font) + 10
    draw.text((CONTENT_LEFT, y), note, font=note_font, fill=RED)
    y += text_height("Ay", note_font) + 28

    for i, comp in enumerate(rows):
        name = _fit_ellipsis(comp.get("name") or "", name_font, CONTENT_WIDTH)
        draw.text((CONTENT_LEFT, y), name, font=name_font, fill=BLACK)
        y += name_h + 8

        meta = _comp_meta(comp)
        if meta:
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(meta, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=GREEN,
            )
        y += meta_h

        if i < len(rows) - 1:
            y += row_gap
