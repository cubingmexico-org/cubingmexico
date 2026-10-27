"""SEMANA slides about the week's results: cover, competitions and numbers."""

from __future__ import annotations

from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    Font,
    load_font,
    text_height,
    text_width,
)
from social.weekly_digest.layout import (
    CONTENT_LEFT,
    CONTENT_RIGHT,
    CONTENT_WIDTH,
    PANEL_BOTTOM,
    PANEL_LEFT,
    PANEL_RIGHT,
    RULE,
    TILE_BG,
    _distribute_start_and_gap,
    _draw_compact_header,
    _draw_full_header,
    _draw_section_label,
    _draw_slide_index,
    _draw_stat_tiles,
    _fit_ellipsis,
    _fit_headline,
    _new_canvas,
    _panel_bottom_y,
    _png_bytes,
    _wrap_text,
)
from social.weekly_digest.slide_parts import (
    _content_bottom,
    _draw_upcoming_footer,
    _estimate_comp_block_h,
)
from social.weekly_digest.story import (
    _comp_meta,
    _comp_rows,
    _stat_tiles,
    _states_phrase,
    _stats_line,
    _week_subtitle,
    weekly_cover_story,
)


def _slide_cover(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    subtitle = _week_subtitle(payload)
    panel_top = _draw_full_header(canvas, draw, subtitle)
    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    is_thin = bool(payload.get("is_thin"))
    section_font = load_font(30)
    meta_font = load_font(24)

    if is_thin:
        y = panel_top + 56
        y = _draw_section_label(draw, "SEMANA TRANQUILA", section_font, x=CONTENT_LEFT, y=y)
        note_font = load_font(32)
        note = "Sin competencias con resultados esta semana"
        for line in _wrap_text(note, note_font, CONTENT_WIDTH, max_lines=3) or [note]:
            draw.text((CONTENT_LEFT, y), line, font=note_font, fill=RED)
            y += text_height("Ay", note_font) + 10
        upcoming = payload.get("upcoming_comps") or []
        if upcoming:
            y += 36
            count_font = load_font(80)
            label_font = load_font(30)
            n = len(upcoming)
            draw.text((CONTENT_LEFT, y), str(n), font=count_font, fill=GREEN)
            y += text_height("Ay", count_font) + 8
            draw.text(
                (CONTENT_LEFT, y),
                "próximas en 14 días" if n != 1 else "próxima en 14 días",
                font=label_font,
                fill=BLACK,
            )
            y += text_height("Ay", label_font) + 28
            # Preview first upcoming on cover.
            first = upcoming[0]
            name_font = load_font(34)
            for line in _wrap_text(first.get("name") or "", name_font, CONTENT_WIDTH, max_lines=2) or ["—"]:
                draw.text((CONTENT_LEFT, y), line, font=name_font, fill=BLACK)
                y += text_height("Ay", name_font) + 4
            meta = _comp_meta(first)
            if meta:
                draw.text((CONTENT_LEFT, y), meta, font=meta_font, fill=GREEN)
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    story = weekly_cover_story(payload) or {
        "kind": "comp",
        "kicker": "EN RESUMEN",
        "headline": "Semana con actividad cubera",
        "sub": "",
    }
    rows, late_only = _comp_rows(payload)
    comps = [c for c, _ in rows]

    headline_font, headline_lines = _fit_headline(
        story["headline"], CONTENT_WIDTH, sizes=(76, 72, 68, 64, 60, 56, 52, 48, 44)
    )
    sub_font = load_font(32)
    ctx_name_font = load_font(34)
    ctx_meta_font = load_font(26)
    stats_font = load_font(32)

    context: list[tuple[str, Font, tuple]] = []
    if story["kind"] != "comp" and len(comps) == 1:
        comp = comps[0]
        for line in _wrap_text(comp.get("name") or "", ctx_name_font, CONTENT_WIDTH):
            context.append((line, ctx_name_font, BLACK))
        meta = _comp_meta(comp)
        if not late_only and not comp.get("has_results"):
            meta = f"{meta} · resultados pendientes".strip(" ·")
        if meta:
            context.append((_fit_ellipsis(meta, ctx_meta_font, CONTENT_WIDTH), ctx_meta_font, GREEN))
    elif story["kind"] != "comp" and len(comps) > 1:
        line = f"{len(comps)} competencias {_states_phrase(comps)}".strip()
        context.append((line, ctx_name_font, BLACK))

    stats = _stats_line(payload)
    band_h = 104 if stats else 0
    band_bottom = _panel_bottom_y() - 8
    band_top = band_bottom - band_h
    content_bottom = band_top - 28 if stats else _panel_bottom_y()

    header_h = text_height("Ay", section_font) + 8 + 4 + 16
    headline_line_h = text_height("Ay", headline_font) + 10
    content_h = header_h + len(headline_lines) * headline_line_h
    if story.get("sub"):
        content_h += 8 + text_height("Ay", sub_font)
    ctx_gap = 48
    if context:
        content_h += ctx_gap + sum(text_height("Ay", f) + 10 for _, f, _ in context)

    area_top = panel_top + 36
    y = area_top + max(0, (content_bottom - area_top - content_h) // 2)
    y = _draw_section_label(draw, story["kicker"], section_font, x=CONTENT_LEFT, y=y)
    for line in headline_lines:
        draw.text((CONTENT_LEFT, y), line, font=headline_font, fill=BLACK)
        y += headline_line_h
    if story.get("sub"):
        y += 8
        draw.text(
            (CONTENT_LEFT, y),
            _fit_ellipsis(story["sub"], sub_font, CONTENT_WIDTH),
            font=sub_font,
            fill=GREEN,
        )
        y += text_height("Ay", sub_font)
    if context:
        y += ctx_gap
        draw.rectangle([CONTENT_LEFT, y - 24, CONTENT_LEFT + 48, y - 20], fill=RULE)
        for text, font, fill in context:
            draw.text((CONTENT_LEFT, y), text, font=font, fill=fill)
            y += text_height("Ay", font) + 10

    if stats:
        draw.rounded_rectangle(
            [CONTENT_LEFT, band_top, CONTENT_RIGHT, band_bottom],
            radius=20,
            fill=TILE_BG,
        )
        draw.text(
            ((CONTENT_LEFT + CONTENT_RIGHT) // 2, (band_top + band_bottom) // 2),
            _fit_ellipsis(stats, stats_font, CONTENT_WIDTH - 40),
            font=stats_font,
            fill=CREAM,
            anchor="mm",
        )

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_competencias(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    rows, late_only = _comp_rows(payload)
    eyebrow = "RESULTADOS RECIENTES" if late_only else "COMPETENCIAS"
    panel_top = _draw_compact_header(canvas, draw, eyebrow)
    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    n = len(rows)
    tag_font = load_font(16)
    bottom = _panel_bottom_y()

    if n == 0:
        section_font = load_font(28)
        empty_font = load_font(28)
        y = panel_top + (PANEL_BOTTOM - panel_top) // 3
        y = _draw_section_label(draw, eyebrow, section_font, x=CONTENT_LEFT, y=y)
        draw.text(
            (CONTENT_LEFT, y),
            "Sin competencias con resultados",
            font=empty_font,
            fill=RED,
        )
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    # Single comp → hero layout (typical week: one weekend comp).
    if n == 1:
        comp, tag = rows[0]
        section_font, name_font, meta_font = (
            load_font(40),
            load_font(52),
            load_font(32),
        )
        header_h = text_height("Ay", section_font) + 8 + 4 + 16
        name_w = CONTENT_WIDTH - (120 if tag else 0)
        name_lines = _wrap_text(comp.get("name") or "", name_font, name_w, max_lines=3) or ["—"]
        meta = _comp_meta(comp)
        status = ""
        if not tag and not late_only:
            status = "" if comp.get("has_results") else " · resultados pendientes"
        content_h = len(name_lines) * (text_height("Ay", name_font) + 6)
        if meta or status:
            content_h += 8 + text_height("Ay", meta_font)
        y, _ = _distribute_start_and_gap(
            panel_top=panel_top,
            header_h=header_h,
            content_h=content_h,
            n_gaps=0,
            top_pad=36,
        )
        y = _draw_section_label(draw, eyebrow, section_font, x=CONTENT_LEFT, y=y - header_h)
        name_top = y
        for line in name_lines:
            draw.text((CONTENT_LEFT, y), line, font=name_font, fill=BLACK)
            y += text_height("Ay", name_font) + 6
        if tag:
            tw = text_width(tag.upper(), tag_font)
            th = text_height("Ay", tag_font)
            bx0 = CONTENT_RIGHT - tw - 24
            draw.rounded_rectangle(
                [bx0, name_top + 4, CONTENT_RIGHT, name_top + th + 16],
                radius=8,
                fill=GREEN if tag == "recién" else RED,
            )
            draw.text(
                ((bx0 + CONTENT_RIGHT) // 2, name_top + 10 + th // 2),
                tag.upper(),
                font=tag_font,
                fill=CREAM,
                anchor="mm",
            )
        if meta or status:
            y += 10
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis((meta or "") + status, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=GREEN,
            )
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    # Scale type to fill panel based on row count (2+ comps).
    if n <= 2:
        section_font, name_font, meta_font = load_font(32), load_font(40), load_font(28)
    elif n <= 4:
        section_font, name_font, meta_font = load_font(28), load_font(34), load_font(24)
    else:
        section_font, name_font, meta_font = load_font(26), load_font(30), load_font(22)

    context = _states_phrase([c for c, _ in rows]).upper()
    header_h = text_height("Ay", section_font) + 8 + 4 + 16 if context else 0
    bottom = _content_bottom(payload, "competencias")
    content_h = _estimate_comp_block_h(rows, name_font=name_font, meta_font=meta_font)
    # Strip per-row trailing pad from estimate for gap calc.
    content_h = max(0, content_h - 8 * len(rows))
    y, gap = _distribute_start_and_gap(
        panel_top=panel_top,
        header_h=header_h,
        content_h=content_h,
        n_gaps=max(0, len(rows) - 1),
        min_gap=20,
        max_gap=100,
        top_pad=24,
        bottom=bottom,
    )
    if context:
        y = _draw_section_label(draw, context, section_font, x=CONTENT_LEFT, y=y - header_h)

    for i, (comp, tag) in enumerate(rows):
        if y > bottom - 50:
            break
        name_w = CONTENT_WIDTH - (110 if tag else 0)
        name_lines = _wrap_text(comp.get("name") or "", name_font, name_w, max_lines=2) or ["—"]
        name_top = y
        for line in name_lines:
            draw.text((CONTENT_LEFT, y), line, font=name_font, fill=BLACK)
            y += text_height("Ay", name_font) + 2
        if tag:
            tw = text_width(tag.upper(), tag_font)
            th = text_height("Ay", tag_font)
            bx0 = CONTENT_RIGHT - tw - 20
            draw.rounded_rectangle(
                [bx0, name_top + 2, CONTENT_RIGHT, name_top + th + 12],
                radius=8,
                fill=GREEN if tag == "recién" else RED,
            )
            draw.text(
                ((bx0 + CONTENT_RIGHT) // 2, name_top + 7 + th // 2),
                tag.upper(),
                font=tag_font,
                fill=CREAM,
                anchor="mm",
            )
        meta = _comp_meta(comp)
        status = ""
        if not tag and not late_only:
            status = "" if comp.get("has_results") else " · resultados pendientes"
        if meta or status:
            line = _fit_ellipsis((meta or "") + status, meta_font, CONTENT_WIDTH)
            draw.text((CONTENT_LEFT, y), line, font=meta_font, fill=GREEN)
            y += text_height("Ay", meta_font) + 4
        if i < len(rows) - 1:
            y += gap

    _draw_upcoming_footer(draw, payload, "competencias")
    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_numeros(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    panel_top = _draw_compact_header(canvas, draw, "EN NÚMEROS")
    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    state_font = load_font(28)
    breaker_font = load_font(26)
    meta_font = load_font(24)
    tiles = _stat_tiles(payload, limit=4)
    sr_by_state = payload.get("sr_by_state") or []
    if len(sr_by_state) < 2:
        sr_by_state = []
    sr_breakers = payload.get("sr_breakers") or []
    sr_total = int(payload.get("sr_total") or 0)
    breaker_states = {(r.get("state_name") or "").strip() for r in sr_breakers}
    show_breaker_state = len(breaker_states) > 1

    bottom = _content_bottom(payload, "numeros")
    section_gap = 56
    meta_h = text_height("Ay", meta_font)
    tiles_h = 2 * (160 + 18) if len(tiles) == 4 else (180 if len(tiles) == 3 else 190) + 18
    block_h = tiles_h
    if sr_total and sr_by_state:
        state_rows = (min(len(sr_by_state), 6) + 1) // 2
        block_h += section_gap + meta_h + 14
        block_h += state_rows * (text_height("Ay", state_font) + 18) + 12
    if sr_breakers:
        block_h += section_gap + meta_h + 14
        block_h += min(len(sr_breakers), 4) * (text_height("Ay", breaker_font) + 16)
    area_top = panel_top + 36
    y = area_top + max(0, (bottom - area_top - block_h) // 2)

    if len(tiles) == 4:
        y = _draw_stat_tiles(
            draw,
            tiles[:2],
            x0=CONTENT_LEFT,
            x1=CONTENT_RIGHT,
            y=y,
            tile_h=160,
            num_size=60,
        )
        y = _draw_stat_tiles(
            draw,
            tiles[2:],
            x0=CONTENT_LEFT,
            x1=CONTENT_RIGHT,
            y=y,
            tile_h=160,
            num_size=60,
        )
    elif len(tiles) == 3:
        y = _draw_stat_tiles(
            draw,
            tiles,
            x0=CONTENT_LEFT,
            x1=CONTENT_RIGHT,
            y=y,
            tile_h=180,
            num_size=62,
        )
    else:
        y = _draw_stat_tiles(
            draw,
            tiles,
            x0=CONTENT_LEFT,
            x1=CONTENT_RIGHT,
            y=y,
            tile_h=190,
            num_size=64,
        )

    if sr_total and sr_by_state and y < bottom - 100:
        y += section_gap
        draw.text(
            (CONTENT_LEFT, y),
            "SR POR ESTADO",
            font=meta_font,
            fill=GREEN,
        )
        y += text_height("Ay", meta_font) + 14
        # Two-column state list for better fill.
        col_w = (CONTENT_WIDTH - 24) // 2
        states = sr_by_state[:6]
        mid = (len(states) + 1) // 2
        left_states = states[:mid]
        right_states = states[mid:]
        row_h = text_height("Ay", state_font) + 18
        for i, row in enumerate(left_states):
            label = f"{row['state_name']}  {row['count']}"
            draw.text(
                (CONTENT_LEFT, y + i * row_h),
                _fit_ellipsis(label, state_font, col_w),
                font=state_font,
                fill=BLACK,
            )
        for i, row in enumerate(right_states):
            label = f"{row['state_name']}  {row['count']}"
            draw.text(
                (CONTENT_LEFT + col_w + 24, y + i * row_h),
                _fit_ellipsis(label, state_font, col_w),
                font=state_font,
                fill=BLACK,
            )
        y += max(len(left_states), len(right_states), 1) * row_h + 12

    if sr_breakers and y < bottom - 90:
        y += section_gap
        heading = "MÁS SR"
        if not show_breaker_state and breaker_states - {"", "Sin estado"}:
            heading = f"MÁS SR · {next(iter(breaker_states)).upper()}"
        draw.text(
            (CONTENT_LEFT, y),
            heading,
            font=meta_font,
            fill=GREEN,
        )
        y += text_height("Ay", meta_font) + 14
        for row in sr_breakers[:4]:
            if y > bottom - 28:
                break
            line = f"{row.get('person_name') or ''} · {row.get('count')} SR"
            if show_breaker_state:
                line += f" · {row.get('state_name') or ''}"
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(line, breaker_font, CONTENT_WIDTH),
                font=breaker_font,
                fill=BLACK,
            )
            y += text_height("Ay", breaker_font) + 16

    _draw_upcoming_footer(draw, payload, "numeros")
    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)
