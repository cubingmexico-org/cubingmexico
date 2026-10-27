"""SEMANA slides about people: debutants and highlights."""

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
    CONTENT_RIGHT,
    CONTENT_WIDTH,
    PANEL_BOTTOM,
    PANEL_LEFT,
    PANEL_RIGHT,
    RULE,
    _distribute_start_and_gap,
    _draw_compact_header,
    _draw_level_badge,
    _draw_section_label,
    _draw_slide_index,
    _fit_ellipsis,
    _new_canvas,
    _png_bytes,
    _wrap_text,
)
from social.weekly_digest.slide_parts import (
    _content_bottom,
    _draw_upcoming_footer,
)
from social.weekly_digest.story import (
    KIND_ES,
    _has_numeros,
)


def _slide_debutantes(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    panel_top = _draw_compact_header(canvas, draw, "BIENVENIDOS")
    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    debuts = list(payload.get("debuts") or [])[:8]
    debut_count = max(int(payload.get("debut_count") or 0), len(debuts))
    bottom = _content_bottom(payload, "debutantes")

    count_font = load_font(96)
    label_font = load_font(30)
    two_cols = len(debuts) > 4
    name_font = load_font(26 if two_cols else 32)
    state_font = load_font(20 if two_cols else 24)
    more_font = load_font(24)

    col_gap = 28
    col_w = (CONTENT_WIDTH - col_gap) // 2 if two_cols else CONTENT_WIDTH
    per_col = (len(debuts) + 1) // 2 if two_cols else len(debuts)
    name_h = text_height("Ay", name_font)
    state_h = text_height("Ay", state_font)
    entry_h = name_h + 8 + state_h
    extra = debut_count - len(debuts)

    count_h = count_font.getbbox(str(debut_count))[3] + 20
    head_h = count_h + text_height("Ay", label_font)
    list_h = per_col * entry_h
    more_h = text_height("Ay", more_font) + 24 if extra > 0 else 0
    n_gaps = max(0, per_col - 1)
    area_top = panel_top + 40
    head_gap = 48
    free = bottom - area_top - head_h - head_gap - list_h - more_h
    row_gap = max(14, min(40, free // max(1, n_gaps + 2))) if n_gaps else 0
    used = head_h + head_gap + list_h + n_gaps * row_gap + more_h
    y = area_top + max(0, (bottom - area_top - used) // 2)

    draw.text((CONTENT_LEFT, y), str(debut_count), font=count_font, fill=GREEN)
    y += count_h
    noun = "nuevo cubero" if debut_count == 1 else "nuevos cuberos"
    draw.text(
        (CONTENT_LEFT, y),
        f"{noun} en su primera competencia",
        font=label_font,
        fill=BLACK,
    )
    y += text_height("Ay", label_font)
    y += head_gap - 20
    draw.rectangle([CONTENT_LEFT, y, CONTENT_LEFT + 48, y + 4], fill=RULE)
    y += 20

    list_top = y
    for i, debut in enumerate(debuts):
        col = i // per_col if two_cols else 0
        row = i % per_col if two_cols else i
        x = CONTENT_LEFT + col * (col_w + col_gap)
        ry = list_top + row * (entry_h + row_gap)
        draw.text(
            (x, ry),
            _fit_ellipsis(debut.get("person_name") or "", name_font, col_w),
            font=name_font,
            fill=BLACK,
        )
        state = (debut.get("state_name") or "").strip()
        if state:
            draw.text(
                (x, ry + name_h + 8),
                _fit_ellipsis(state, state_font, col_w),
                font=state_font,
                fill=GREEN,
            )
    y = list_top + per_col * entry_h + n_gaps * row_gap

    if extra > 0:
        y += 24
        draw.text((CONTENT_LEFT, y), f"+{extra} más", font=more_font, fill=RED)

    _draw_upcoming_footer(draw, payload, "debutantes")
    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_destacados(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    panel_top = _draw_compact_header(canvas, draw, "DESTACADOS")
    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    highlights = list(payload.get("record_highlights") or [])
    # Fill thin highlights with SR breakers as secondary callouts.
    sr_breakers = payload.get("sr_breakers") or []
    n = len(highlights)
    if n <= 1:
        section_font, name_font, meta_font, badge_font = (
            load_font(32),
            load_font(40),
            load_font(28),
            load_font(26),
        )
    elif n <= 3:
        section_font, name_font, meta_font, badge_font = (
            load_font(28),
            load_font(34),
            load_font(26),
            load_font(24),
        )
    else:
        section_font, name_font, meta_font, badge_font = (
            load_font(26),
            load_font(30),
            load_font(22),
            load_font(22),
        )

    header_h = text_height("Ay", section_font) + 8 + 4 + 16
    show = highlights[:5]
    # Estimate highlight block only; SR breakers fill remaining space below.
    content_h = 0
    for h in show:
        person_lines = _wrap_text(
            h.get("person_name") or "",
            name_font,
            CONTENT_WIDTH - 70,
            max_lines=2,
        ) or ["—"]
        content_h += len(person_lines) * (text_height("Ay", name_font) + 2)
        content_h += text_height("Ay", meta_font) + 4  # event
        if (h.get("competition_name") or "").strip():
            content_h += text_height("Ay", meta_font) + 4
    show_breakers = n <= 2 and bool(sr_breakers) and not _has_numeros(payload)

    bottom = _content_bottom(payload, "destacados")
    y, gap = _distribute_start_and_gap(
        panel_top=panel_top,
        header_h=header_h,
        content_h=content_h,
        n_gaps=max(0, len(show) - 1),
        min_gap=24,
        max_gap=80,
        top_pad=36,
        bottom=bottom,
    )
    # Prefer highlights in the upper-mid band when breakers will follow.
    if show_breakers:
        y = min(y, panel_top + 48 + header_h)

    record_label = f"{n} RÉCORD{'S' if n != 1 else ''} DE LA SEMANA"
    y = _draw_section_label(draw, record_label, section_font, x=CONTENT_LEFT, y=y - header_h)

    for i, h in enumerate(show):
        if y > bottom - 60:
            break
        level = str(h.get("level") or "")
        badge_right = _draw_level_badge(draw, level, badge_font, x=CONTENT_LEFT, cy=y + 16)
        text_x = badge_right + 14
        person_w = CONTENT_RIGHT - text_x
        person_lines = _wrap_text(
            h.get("person_name") or "",
            name_font,
            person_w,
            max_lines=2,
        ) or ["—"]
        for line in person_lines:
            draw.text((text_x, y), line, font=name_font, fill=BLACK)
            y += text_height("Ay", name_font) + 2
        kind = (h.get("kind") or "").strip()
        kind = KIND_ES.get(kind, kind)
        event = h.get("event_name") or ""
        event_line = f"{event}" + (f" · {kind}" if kind else "")
        draw.text(
            (CONTENT_LEFT, y),
            _fit_ellipsis(event_line, meta_font, CONTENT_WIDTH),
            font=meta_font,
            fill=GREEN,
        )
        y += text_height("Ay", meta_font) + 4
        comp = (h.get("competition_name") or "").strip()
        if comp:
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(comp, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=BLACK,
            )
            y += text_height("Ay", meta_font) + 4
        if i < len(show) - 1:
            y += gap

    if show_breakers and y < bottom - 80:
        breakers = sr_breakers[:4]
        breaker_h = text_height("Ay", meta_font) + 14 + len(breakers) * (text_height("Ay", meta_font) + 16)
        remaining = bottom - y - breaker_h
        y += max(36, remaining // 2) if remaining > 36 else 28
        draw.text((CONTENT_LEFT, y), "SR DESTACADOS", font=meta_font, fill=GREEN)
        y += text_height("Ay", meta_font) + 14
        for row in breakers:
            if y > bottom - 28:
                break
            line = f"{row.get('person_name') or ''} · {row.get('count')} SR · {row.get('state_name') or ''}"
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(line, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=BLACK,
            )
            y += text_height("Ay", meta_font) + 16

    _draw_upcoming_footer(draw, payload, "destacados")
    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)
