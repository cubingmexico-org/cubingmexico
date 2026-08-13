"""Generate 1080x1080 SEMANA weekly digest social graphics (multi-slide)."""

from __future__ import annotations

import io
from datetime import date, datetime

from PIL import Image, ImageDraw, ImageFont

from social.calendar_mx import format_date_range_short, format_day_month_short
from social.image_common import (
    BLACK,
    CREAM,
    GREEN,
    RED,
    SIZE,
    WHITE,
    center_text,
    format_place_line,
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

SLIDE_TITLES = {
    "cover": "Portada",
    "competencias": "Competencias",
    "numeros": "En números",
    "destacados": "Destacados",
    "proximas": "Próximas",
}


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


def _as_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def _comp_date_line(comp: dict) -> str:
    start = _as_date(comp.get("start_date"))
    end = _as_date(comp.get("end_date"))
    if start is None:
        return ""
    if end is None or end == start:
        return format_day_month_short(start)
    return format_date_range_short(start, end)


def _comp_meta(comp: dict) -> str:
    date_bit = _comp_date_line(comp)
    city = (comp.get("city_name") or "").strip().rstrip(".")
    state = (comp.get("state_name") or "").strip()
    if city and state and city.lower() == state.lower():
        place = city
    else:
        place = format_place_line(city or None, state or None)
    return " · ".join(p for p in (date_bit, place) if p)



def _panel_bottom_y() -> int:
    return PANEL_BOTTOM - FOOTER_RESERVE


def _estimate_comp_block_h(
    rows: list[tuple[dict, str | None]],
    *,
    name_font: ImageFont.ImageFont,
    meta_font: ImageFont.ImageFont,
) -> int:
    h = 0
    for comp, _tag in rows:
        lines = _wrap_text(
            comp.get("name") or "", name_font, CONTENT_WIDTH - 110, max_lines=2
        ) or ["—"]
        h += len(lines) * (text_height("Ay", name_font) + 2)
        if _comp_meta(comp):
            h += text_height("Ay", meta_font) + 4
        h += 8
    return h


def _distribute_start_and_gap(
    *,
    panel_top: int,
    header_h: int,
    content_h: int,
    n_gaps: int,
    min_gap: int = 16,
    max_gap: int = 120,
    top_pad: int = 28,
) -> tuple[int, int]:
    """Return (y_start_after_header, gap) to vertically fill the cream panel.

    y_start_after_header is where content begins (caller draws section label
    starting at y_start_after_header - header_h).
    """
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



def _wrap_text(
    text: str, font: ImageFont.ImageFont, max_width: int, *, max_lines: int = 2
) -> list[str]:
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


def _upcoming_window_label(payload: dict) -> str:
    publish = _as_date(payload.get("publish_monday"))
    if publish is None:
        return "próximas 14 días"
    end = date.fromordinal(publish.toordinal() + 13)
    return format_date_range_short(publish, end)


def _week_subtitle(payload: dict) -> str:
    if payload.get("is_thin"):
        return _upcoming_window_label(payload)
    return payload.get("competition_week_label") or payload.get("week_key") or ""


def _stat_tiles(payload: dict, *, limit: int = 4) -> list[tuple[str, str]]:
    records = payload.get("record_counts") or {}
    wr = int(records.get("wr") or 0)
    nar = int(records.get("nar") or 0)
    nr = int(records.get("nr") or 0)
    sr_total = int(payload.get("sr_total") or 0)
    podium_count = int(payload.get("podium_count") or 0)
    debut_count = int(payload.get("debut_count") or 0)

    tiles: list[tuple[str, str]] = []
    if wr:
        tiles.append((str(wr), "WR"))
    if nar:
        tiles.append((str(nar), "NAR"))
    if nr:
        tiles.append((str(nr), "NR"))
    if sr_total:
        tiles.append((str(sr_total), "SR"))
    if podium_count:
        tiles.append((str(podium_count), "Podios"))
    if debut_count:
        tiles.append((str(debut_count), "Debut"))
    if len(tiles) > limit:
        priority = {"WR": 0, "NAR": 1, "NR": 2, "SR": 3, "Podios": 4, "Debut": 5}
        tiles = sorted(tiles, key=lambda t: priority.get(t[1], 9))[:limit]
    return tiles


def _has_numeros(payload: dict) -> bool:
    return bool(_stat_tiles(payload, limit=6))


def _comp_rows(payload: dict) -> tuple[list[tuple[dict, str | None]], bool]:
    """Return (rows, late_only)."""
    primary = payload.get("primary_comps") or []
    late = payload.get("late_comps") or []
    has_primary = bool(primary)
    has_late = bool(late)
    mixed = has_primary and has_late
    rows: list[tuple[dict, str | None]] = []
    for comp in primary[:5]:
        flag = None if comp.get("has_results") else "pendientes"
        rows.append((comp, flag))
    late_budget = max(0, 6 - len(rows))
    for comp in late[:late_budget]:
        tag = "recién" if mixed else None
        rows.append((comp, tag))
    return rows, has_late and not has_primary


def plan_weekly_digest_slides(payload: dict) -> list[dict]:
    """Return ordered slide descriptors: {id, title}. Cap at 5."""
    if payload.get("is_empty"):
        return []

    slides: list[dict] = []

    def add(slide_id: str) -> None:
        if len(slides) >= 5:
            return
        slides.append({"id": slide_id, "title": SLIDE_TITLES[slide_id]})

    is_thin = bool(payload.get("is_thin"))
    add("cover")

    if is_thin:
        if payload.get("upcoming_comps"):
            add("proximas")
        return slides

    rows, _ = _comp_rows(payload)
    if rows:
        add("competencias")
    if _has_numeros(payload):
        add("numeros")
    if payload.get("record_highlights"):
        add("destacados")
    if payload.get("upcoming_comps"):
        add("proximas")
    return slides


def generate_weekly_digest_slides(*, payload: dict) -> list[dict]:
    """Generate all slides: [{id, title, png}]."""
    plan = plan_weekly_digest_slides(payload)
    out: list[dict] = []
    total = len(plan)
    for i, slide in enumerate(plan):
        png = _render_slide(
            payload,
            slide_id=slide["id"],
            index=i,
            total=total,
        )
        out.append({"id": slide["id"], "title": slide["title"], "png": png})
    return out


def generate_weekly_digest_png(*, payload: dict) -> bytes:
    """Compat: first slide only (cover / first planned slide)."""
    slides = generate_weekly_digest_slides(payload=payload)
    if slides:
        return slides[0]["png"]
    # Empty fallback — solid green with SEMANA header.
    return _render_slide(payload, slide_id="cover", index=0, total=1)


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


def _draw_slide_index(
    draw: ImageDraw.ImageDraw, *, index: int, total: int
) -> None:
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
) -> int:
    """Full SEMANA header. Returns panel_top."""
    logo_bottom = paste_logo(canvas, max_size=(110, 110), y=44)
    title_font = load_font(44)
    range_font = load_font(26)
    title_y = logo_bottom + 8
    center_text(draw, "SEMANA", title_font, title_y, WHITE)
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
) -> int:
    """Compact header band for inner slides. Returns panel_top."""
    logo_bottom = paste_logo(canvas, max_size=(72, 72), y=40)
    eyebrow_font = load_font(24)
    title_font = load_font(36)
    ey = logo_bottom + 4
    center_text(draw, "SEMANA", eyebrow_font, ey, WHITE)
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


def _render_slide(
    payload: dict,
    *,
    slide_id: str,
    index: int,
    total: int,
) -> bytes:
    if slide_id == "cover":
        return _slide_cover(payload, index=index, total=total)
    if slide_id == "competencias":
        return _slide_competencias(payload, index=index, total=total)
    if slide_id == "numeros":
        return _slide_numeros(payload, index=index, total=total)
    if slide_id == "destacados":
        return _slide_destacados(payload, index=index, total=total)
    if slide_id == "proximas":
        return _slide_proximas(payload, index=index, total=total)
    return _slide_cover(payload, index=index, total=total)


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
    tiles = _stat_tiles(payload, limit=3)
    section_font = load_font(30)
    body_font = load_font(28)
    meta_font = load_font(24)
    bottom = _panel_bottom_y()

    if is_thin:
        y = panel_top + 56
        y = _draw_section_label(
            draw, "SEMANA TRANQUILA", section_font, x=CONTENT_LEFT, y=y
        )
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
            for line in _wrap_text(
                first.get("name") or "", name_font, CONTENT_WIDTH, max_lines=2
            ) or ["—"]:
                draw.text((CONTENT_LEFT, y), line, font=name_font, fill=BLACK)
                y += text_height("Ay", name_font) + 4
            meta = _comp_meta(first)
            if meta:
                draw.text((CONTENT_LEFT, y), meta, font=meta_font, fill=GREEN)
        _draw_slide_index(draw, index=index, total=total)
        return _png_bytes(canvas)

    # Full cover: hero tiles + week snapshot lists (spread to fill panel).
    primary = payload.get("primary_comps") or []
    late = payload.get("late_comps") or []
    upcoming = payload.get("upcoming_comps") or []
    highlights = payload.get("record_highlights") or []
    bottom = _panel_bottom_y()

    snap_font = load_font(26)
    snap_meta = load_font(26)
    blocks: list[tuple[str, list[str]]] = []

    comp_names = [c.get("name") or "" for c in (primary + late)[:4]]
    if comp_names:
        blocks.append(("Competencias", comp_names))
    if highlights:
        h0 = highlights[0]
        label = f"{h0.get('level') or ''} · {h0.get('person_name') or ''}".strip(
            " ·"
        )
        more = f" +{len(highlights) - 1} más" if len(highlights) > 1 else ""
        blocks.append(("Destacado", [label + more]))
    if upcoming:
        blocks.append(
            ("Próximas", [c.get("name") or "" for c in upcoming[:2]])
        )

    # Measure tiles + blocks to distribute leftover space between sections.
    tiles_h = 148 + 18 if tiles else 40
    header_h = text_height("Ay", section_font) + 8 + 4 + 16
    block_heights: list[int] = []
    for title, lines in blocks:
        h = text_height("Ay", snap_font) + 6
        for raw in lines:
            wrapped = _wrap_text(raw, snap_meta, CONTENT_WIDTH, max_lines=2) or [raw]
            h += len(wrapped) * (text_height("Ay", snap_meta) + 4) + 6
        block_heights.append(h)
    blocks_h = sum(block_heights)
    top_pad = 28
    available = bottom - (panel_top + top_pad) - header_h - tiles_h - blocks_h
    n_gaps = len(blocks)  # gap after tiles + between blocks
    section_gap = max(18, min(56, available // max(1, n_gaps))) if n_gaps else 18

    y = panel_top + top_pad
    y = _draw_section_label(draw, "EN RESUMEN", section_font, x=CONTENT_LEFT, y=y)

    if tiles:
        y = _draw_stat_tiles(
            draw,
            tiles,
            x0=CONTENT_LEFT,
            x1=CONTENT_RIGHT,
            y=y,
            tile_h=148,
            num_size=56,
        )
    else:
        draw.text(
            (CONTENT_LEFT, y),
            "Semana con actividad cubera",
            font=body_font,
            fill=BLACK,
        )
        y += text_height("Ay", body_font) + 20

    for title, lines in blocks:
        y += section_gap
        if y > bottom - 60:
            break
        draw.text((CONTENT_LEFT, y), title.upper(), font=snap_font, fill=GREEN)
        y += text_height("Ay", snap_font) + 8
        for raw in lines:
            for line in _wrap_text(raw, snap_meta, CONTENT_WIDTH, max_lines=2) or [
                raw
            ]:
                if y > bottom - 28:
                    break
                draw.text((CONTENT_LEFT, y), line, font=snap_meta, fill=BLACK)
                y += text_height("Ay", snap_meta) + 4
            y += 8

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
        name_lines = _wrap_text(
            comp.get("name") or "", name_font, name_w, max_lines=3
        ) or ["—"]
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
        y = _draw_section_label(
            draw, eyebrow, section_font, x=CONTENT_LEFT, y=y - header_h
        )
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

    header_h = text_height("Ay", section_font) + 8 + 4 + 16
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
    )
    y = _draw_section_label(draw, eyebrow, section_font, x=CONTENT_LEFT, y=y - header_h)

    for i, (comp, tag) in enumerate(rows):
        if y > bottom - 50:
            break
        name_w = CONTENT_WIDTH - (110 if tag else 0)
        name_lines = _wrap_text(
            comp.get("name") or "", name_font, name_w, max_lines=2
        ) or ["—"]
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

    section_font = load_font(28)
    state_font = load_font(28)
    breaker_font = load_font(26)
    meta_font = load_font(24)
    tiles = _stat_tiles(payload, limit=4)
    sr_by_state = payload.get("sr_by_state") or []
    sr_breakers = payload.get("sr_breakers") or []
    sr_total = int(payload.get("sr_total") or 0)

    y = panel_top + 28
    y = _draw_section_label(draw, "EN NÚMEROS", section_font, x=CONTENT_LEFT, y=y)
    bottom = _panel_bottom_y()

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
        # Push lower sections toward mid/bottom of remaining space.
        remaining = bottom - y
        y += max(20, min(48, remaining // 8))
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
        remaining = bottom - y
        y += max(16, min(40, remaining // 10))
        draw.text(
            (CONTENT_LEFT, y),
            "MÁS SR",
            font=meta_font,
            fill=GREEN,
        )
        y += text_height("Ay", meta_font) + 14
        for row in sr_breakers[:4]:
            if y > bottom - 28:
                break
            line = (
                f"{row.get('person_name') or ''} · "
                f"{row.get('count')} SR · {row.get('state_name') or ''}"
            )
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(line, breaker_font, CONTENT_WIDTH),
                font=breaker_font,
                fill=BLACK,
            )
            y += text_height("Ay", breaker_font) + 16

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
    show_breakers = (
        n <= 2 and bool(sr_breakers) and not _has_numeros(payload)
    )

    y, gap = _distribute_start_and_gap(
        panel_top=panel_top,
        header_h=header_h,
        content_h=content_h,
        n_gaps=max(0, len(show) - 1),
        min_gap=24,
        max_gap=80,
        top_pad=36,
    )
    # Prefer highlights in the upper-mid band when breakers will follow.
    if show_breakers:
        y = min(y, panel_top + 48 + header_h)

    y = _draw_section_label(
        draw, "DESTACADOS", section_font, x=CONTENT_LEFT, y=y - header_h
    )
    bottom = _panel_bottom_y()

    for i, h in enumerate(show):
        if y > bottom - 60:
            break
        level = str(h.get("level") or "")
        badge_right = _draw_level_badge(
            draw, level, badge_font, x=CONTENT_LEFT, cy=y + 16
        )
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
        breaker_h = (
            text_height("Ay", meta_font)
            + 14
            + len(breakers) * (text_height("Ay", meta_font) + 16)
        )
        remaining = bottom - y - breaker_h
        y += max(36, remaining // 2) if remaining > 36 else 28
        draw.text((CONTENT_LEFT, y), "SR DESTACADOS", font=meta_font, fill=GREEN)
        y += text_height("Ay", meta_font) + 14
        for row in breakers:
            if y > bottom - 28:
                break
            line = (
                f"{row.get('person_name') or ''} · "
                f"{row.get('count')} SR · {row.get('state_name') or ''}"
            )
            draw.text(
                (CONTENT_LEFT, y),
                _fit_ellipsis(line, meta_font, CONTENT_WIDTH),
                font=meta_font,
                fill=BLACK,
            )
            y += text_height("Ay", meta_font) + 16

    _draw_slide_index(draw, index=index, total=total)
    return _png_bytes(canvas)


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

    if not rows:
        y = panel_top + (PANEL_BOTTOM - panel_top) // 3
        y = _draw_section_label(draw, "PRÓXIMAS", section_font, x=CONTENT_LEFT, y=y)
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
        name_lines = _wrap_text(
            comp.get("name") or "", name_font, CONTENT_WIDTH, max_lines=3
        ) or ["—"]
        meta = _comp_meta(comp)
        content_h = (
            len(name_lines) * (text_height("Ay", name_font) + 6)
            + (text_height("Ay", meta_font) + 8 if meta else 0)
        )
        y, _ = _distribute_start_and_gap(
            panel_top=panel_top,
            header_h=header_h,
            content_h=content_h,
            n_gaps=0,
            top_pad=36,
        )
        y = _draw_section_label(
            draw, "PRÓXIMAS", section_font, x=CONTENT_LEFT, y=y - header_h
        )
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
        lines = _wrap_text(
            comp.get("name") or "", name_font, CONTENT_WIDTH, max_lines=2
        ) or ["—"]
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
    y = _draw_section_label(
        draw, "PRÓXIMAS", section_font, x=CONTENT_LEFT, y=y - header_h
    )

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
    header_h = (
        text_height("Ay", section_font)
        + 10
        + text_height("Ay", note_font)
        + 28
    )
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
    if len(rows) > 1:
        row_gap = max(
            row_gap_min,
            (available - len(rows) * row_h) // (len(rows) - 1),
        )
    else:
        row_gap = 0
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
