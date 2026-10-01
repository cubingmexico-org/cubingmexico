"""Generate 1080x1080 AÑO year-recap social graphics (multi-slide)."""

from __future__ import annotations

from PIL import ImageDraw

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
    text_width,
)
from social.weekly_digest_image import (
    CONTENT_LEFT,
    CONTENT_RIGHT,
    CONTENT_WIDTH,
    KIND_ES,
    PANEL_BOTTOM,
    PANEL_LEFT,
    PANEL_RIGHT,
    TILE_BG,
    _draw_compact_header,
    _draw_full_header,
    _draw_level_badge,
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

SLIDE_TITLES = {
    "cover": "Portada",
    "numeros": "En números",
    "destacados": "Destacados",
    "estados": "Estados",
    "feliz": "Feliz año nuevo",
}

BAR_BG = (226, 219, 204, 255)


def _fmt(n: int) -> str:
    return f"{n:,}"


def _national_records(payload: dict) -> int:
    counts = payload.get("record_counts") or {}
    return sum(int(counts.get(k) or 0) for k in ("wr", "nar", "nr"))


def plan_year_recap_slides(payload: dict) -> list[dict]:
    if payload.get("is_empty"):
        return []
    ids = ["cover", "numeros"]
    if payload.get("record_highlights") or payload.get("sr_breakers"):
        ids.append("destacados")
    if payload.get("top_states"):
        ids.append("estados")
    ids.append("feliz")
    return [{"id": slide_id, "title": SLIDE_TITLES[slide_id]} for slide_id in ids]


def generate_year_recap_slides(*, payload: dict) -> list[dict]:
    plan = plan_year_recap_slides(payload)
    total = len(plan)
    return [
        {
            "id": slide["id"],
            "title": slide["title"],
            "png": _render_slide(payload, slide_id=slide["id"], index=i, total=total),
        }
        for i, slide in enumerate(plan)
    ]


def _render_slide(payload: dict, *, slide_id: str, index: int, total: int) -> bytes:
    renderers = {
        "cover": _slide_cover,
        "numeros": _slide_numeros,
        "destacados": _slide_destacados,
        "estados": _slide_estados,
        "feliz": _slide_feliz,
    }
    return renderers.get(slide_id, _slide_cover)(payload, index=index, total=total)


def _cream_panel(draw: ImageDraw.ImageDraw, panel_top: int) -> None:
    draw.rounded_rectangle([PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM], radius=28, fill=CREAM)


def _slide_cover(payload: dict, *, index: int, total: int) -> bytes:
    year = int(payload["year"])
    canvas, draw = _new_canvas()
    panel_top = _draw_full_header(canvas, draw, "Resumen Cubing México", title=f"AÑO {year}")
    _cream_panel(draw, panel_top)

    section_font = load_font(30)
    sub_font = load_font(30)
    headline_font, headline_lines = _fit_headline(f"{year} en el cubo", CONTENT_WIDTH, sizes=(96, 88, 80, 72))

    tiles: list[tuple[str, str]] = [
        (_fmt(int(payload.get("comp_count") or 0)), "Competencias"),
        (_fmt(int(payload.get("competitor_count") or 0)), "Competidores"),
    ]
    records = _national_records(payload)
    if records:
        tiles.append((_fmt(records), "Récords"))
    elif payload.get("sr_total"):
        tiles.append((_fmt(int(payload["sr_total"])), "SR"))

    state_count = int(payload.get("state_count") or 0)
    sub = f"Competencias en {state_count} estado{'s' if state_count != 1 else ''}"

    header_h = text_height("Ay", section_font) + 28
    line_h = text_height("Ay", headline_font) + 12
    tile_h = 190
    content_h = header_h + len(headline_lines) * line_h + 12 + text_height("Ay", sub_font) + 60 + tile_h
    bottom = _panel_bottom_y()
    y = panel_top + 36 + max(0, (bottom - panel_top - 36 - content_h) // 2)

    y = _draw_section_label(draw, "UN AÑO DE CUBOS", section_font, x=CONTENT_LEFT, y=y)
    for line in headline_lines:
        draw.text((CONTENT_LEFT, y), line, font=headline_font, fill=BLACK)
        y += line_h
    y += 12
    draw.text((CONTENT_LEFT, y), sub, font=sub_font, fill=GREEN)
    y += text_height("Ay", sub_font) + 60
    _draw_stat_tiles(draw, tiles, x0=CONTENT_LEFT, x1=CONTENT_RIGHT, y=y, tile_h=tile_h, num_size=60)

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_numeros(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    panel_top = _draw_compact_header(canvas, draw, "EN NÚMEROS", title=f"AÑO {payload['year']}")
    _cream_panel(draw, panel_top)

    counts = payload.get("record_counts") or {}
    candidates = [
        (int(payload.get("state_count") or 0), "Estados"),
        (int(payload.get("debut_count") or 0), "Debutantes"),
        (int(payload.get("podium_count") or 0), "Podios"),
        (int(payload.get("sr_total") or 0), "SR"),
        (int(counts.get("wr") or 0), "WR"),
        (int(counts.get("nar") or 0), "NAR"),
        (int(counts.get("nr") or 0), "NR"),
        (int(payload.get("city_count") or 0), "Ciudades"),
    ]
    tiles = [(_fmt(v), label) for v, label in candidates if v][:6]

    rows = [tiles[i : i + 3] for i in range(0, len(tiles), 3)] or [[]]
    tile_h = 200
    row_gap = 18
    block_h = len(rows) * tile_h + (len(rows) - 1) * row_gap
    bottom = _panel_bottom_y()
    y = panel_top + max(40, (bottom - panel_top - block_h) // 2)
    for row in rows:
        if not row:
            continue
        _draw_stat_tiles(draw, row, x0=CONTENT_LEFT, x1=CONTENT_RIGHT, y=y, tile_h=tile_h, num_size=60)
        y += tile_h + row_gap

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_destacados(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    panel_top = _draw_compact_header(canvas, draw, "DESTACADOS", title=f"AÑO {payload['year']}")
    _cream_panel(draw, panel_top)

    section_font = load_font(28)
    name_font = load_font(34)
    meta_font = load_font(24)
    badge_font = load_font(24)
    bottom = _panel_bottom_y()

    highlights = payload.get("record_highlights") or []
    if highlights:
        records = _national_records(payload)
        label = f"{records} RÉCORD{'S' if records != 1 else ''} DEL AÑO"
        entry_h = text_height("Ay", name_font) + 10 + 2 * (text_height("Ay", meta_font) + 4)
        show = highlights[:5]
        header_h = text_height("Ay", section_font) + 28
        area_top = panel_top + 40
        free = bottom - area_top - header_h - len(show) * entry_h
        gap = max(20, min(64, free // max(1, len(show))))
        block_h = header_h + len(show) * entry_h + (len(show) - 1) * gap
        y = area_top + max(0, (bottom - area_top - block_h) // 2)
        y = _draw_section_label(draw, label, section_font, x=CONTENT_LEFT, y=y)
        for h in show:
            if y > bottom - entry_h:
                break
            badge_right = _draw_level_badge(draw, str(h.get("level") or ""), badge_font, x=CONTENT_LEFT, cy=y + 18)
            text_x = badge_right + 14
            draw.text(
                (text_x, y),
                _fit_ellipsis(h.get("person_name") or "", name_font, CONTENT_RIGHT - text_x),
                font=name_font,
                fill=BLACK,
            )
            y += text_height("Ay", name_font) + 10
            kind = KIND_ES.get(h.get("kind") or "", h.get("kind") or "")
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(f"{h.get('event_name') or ''} · {kind}", meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=GREEN,
            )
            y += text_height("Ay", meta_font) + 4
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(h.get("competition_name") or "", meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=BLACK,
            )
            y += text_height("Ay", meta_font) + gap
    else:
        breakers = (payload.get("sr_breakers") or [])[:3]
        big_font = load_font(72)
        row_h = 24 + text_height("0", big_font) + 40
        header_h = text_height("Ay", section_font) + 28
        area_top = panel_top + 40
        block_h = header_h + len(breakers) * row_h
        y = area_top + max(0, (bottom - area_top - block_h) // 2)
        y = _draw_section_label(draw, "MÁS RÉCORDS ESTATALES", section_font, x=CONTENT_LEFT, y=y)
        for b in breakers:
            y += 24
            count = str(b.get("count") or 0)
            draw.text((CONTENT_LEFT, y), count, font=big_font, fill=GREEN)
            text_x = CONTENT_LEFT + max(text_width("00", big_font), text_width(count, big_font)) + 28
            draw.text(
                (text_x, y + 4),
                _fit_ellipsis(b.get("person_name") or "", name_font, CONTENT_RIGHT - text_x),
                font=name_font,
                fill=BLACK,
            )
            draw.text(
                (text_x, y + text_height("Ay", name_font) + 16),
                f"SR · {b.get('state_name') or ''}",
                font=meta_font,
                fill=GREEN,
            )
            y += text_height("0", big_font) + 40

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_estados(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    panel_top = _draw_compact_header(canvas, draw, "ESTADOS", title=f"AÑO {payload['year']}")
    _cream_panel(draw, panel_top)

    section_font = load_font(28)
    state_font = load_font(30)
    count_font = load_font(30)
    meta_font = load_font(24)
    busiest_font = load_font(38)
    bottom = _panel_bottom_y()

    states = (payload.get("top_states") or [])[:5]
    busiest = payload.get("busiest_competitor")

    y = panel_top + 40
    y = _draw_section_label(draw, "MÁS COMPETENCIAS", section_font, x=CONTENT_LEFT, y=y)
    max_count = max((s["count"] for s in states), default=1) or 1
    bar_h = 18
    row_h = text_height("Ay", state_font) + 12 + bar_h + 28
    for s in states:
        count_label = str(s["count"])
        cw = text_width(count_label, count_font)
        draw.text(
            (CONTENT_LEFT, y),
            _fit_ellipsis(s["state_name"], state_font, CONTENT_WIDTH - cw - 24),
            font=state_font,
            fill=BLACK,
        )
        draw.text((CONTENT_RIGHT - cw, y), count_label, font=count_font, fill=GREEN)
        by = y + text_height("Ay", state_font) + 12
        draw.rounded_rectangle([CONTENT_LEFT, by, CONTENT_RIGHT, by + bar_h], radius=9, fill=BAR_BG)
        fill_w = max(bar_h, int(CONTENT_WIDTH * s["count"] / max_count))
        draw.rounded_rectangle([CONTENT_LEFT, by, CONTENT_LEFT + fill_w, by + bar_h], radius=9, fill=TILE_BG)
        y += row_h

    if busiest and busiest.get("count") and y < bottom - 150:
        y = max(y + 16, bottom - 150)
        draw.text((CONTENT_LEFT, y), "MÁS COMPETENCIAS ASISTIDAS", font=meta_font, fill=RED)
        y += text_height("Ay", meta_font) + 14
        for line in _wrap_text(busiest.get("person_name") or "", busiest_font, CONTENT_WIDTH, max_lines=1):
            draw.text((CONTENT_LEFT, y), line, font=busiest_font, fill=BLACK)
        y += text_height("Ay", busiest_font) + 12
        state = (busiest.get("state_name") or "").strip()
        n = int(busiest["count"])
        meta = f"{n} competencia{'s' if n != 1 else ''}" + (f" · {state}" if state else "")
        draw.text((CONTENT_LEFT, y), meta, font=meta_font, fill=GREEN)

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


def _slide_feliz(payload: dict, *, index: int, total: int) -> bytes:
    canvas, draw = _new_canvas()
    next_year = int(payload.get("next_year") or int(payload["year"]) + 1)

    logo_bottom = paste_logo(canvas, max_size=(220, 220), y=150)
    kicker_font = load_font(40)
    year_font = load_font(200)
    thanks_font = load_font(36)
    small_font = load_font(28)

    y = logo_bottom + 56
    center_text(draw, "¡FELIZ", kicker_font, y, CREAM)
    y += text_height("Ay", kicker_font) + 24
    center_text(draw, f"{next_year}!", year_font, y, WHITE)
    y += text_height("0", year_font) + 56
    draw.rectangle([SIZE // 2 - 40, y, SIZE // 2 + 40, y + 6], fill=RED)
    y += 40
    center_text(draw, "Gracias por un año increíble de cubos", thanks_font, y, CREAM)
    y += text_height("Ay", thanks_font) + 18
    center_text(draw, "Nos vemos en las competencias", small_font, y, CREAM)

    draw.rectangle([0, SIZE - 28, SIZE, SIZE], fill=RED)
    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)
