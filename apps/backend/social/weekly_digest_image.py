"""Generate 1080x1080 SEMANA weekly digest social graphics."""

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

PANEL_TOP_MIN = 210
PANEL_BOTTOM = 980
PANEL_LEFT = 56
PANEL_RIGHT = SIZE - 56
CONTENT_LEFT = PANEL_LEFT + 36
CONTENT_RIGHT = PANEL_RIGHT - 36
CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT
HEADER_TO_PANEL_GAP = 18

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
    place = format_place_line(comp.get("city_name"), comp.get("state_name"))
    return " · ".join(p for p in (date_bit, place) if p)


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
    # Fit each line and ensure last isn't overflowing.
    fitted = [_fit_ellipsis(line, font, max_width) for line in lines[:max_lines]]
    return [line for line in fitted if line]


def _upcoming_window_label(payload: dict) -> str:
    publish = _as_date(payload.get("publish_monday"))
    if publish is None:
        return "próximas 14 días"
    end = date.fromordinal(publish.toordinal() + 13)
    return format_date_range_short(publish, end)


def _draw_section_label(
    draw: ImageDraw.ImageDraw,
    label: str,
    font: ImageFont.ImageFont,
    *,
    x: int,
    y: int,
) -> int:
    """Section title + short red rule. Returns y below the block."""
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
) -> int:
    """Row of equal green tiles with big number + label. Returns y below."""
    if not tiles:
        return y
    gap = 14
    n = len(tiles)
    width = x1 - x0
    tile_w = (width - gap * (n - 1)) // n
    tile_h = 100
    num_font = load_font(36)
    label_font = load_font(17)

    for i, (value, label) in enumerate(tiles):
        tx0 = x0 + i * (tile_w + gap)
        tx1 = tx0 + tile_w
        draw.rounded_rectangle([tx0, y, tx1, y + tile_h], radius=16, fill=TILE_BG)
        cx = (tx0 + tx1) // 2
        cy_num = y + 38
        cy_label = y + 74
        draw.text((cx, cy_num), value, font=num_font, fill=CREAM, anchor="mm")
        draw.text(
            (cx, cy_label),
            label.upper(),
            font=label_font,
            fill=TILE_LABEL,
            anchor="mm",
        )
    return y + tile_h + 16


def _draw_level_badge(
    draw: ImageDraw.ImageDraw,
    level: str,
    font: ImageFont.ImageFont,
    *,
    x: int,
    cy: int,
) -> int:
    """Small record-level chip. Returns right edge x."""
    label = (level or "").strip().upper() or "?"
    fill = RED if label in {"WR", "NAR", "NR"} else GREEN
    left, top, right, bottom = font.getbbox(label)
    pad_x, pad_y = 10, 6
    box_w = (right - left) + pad_x * 2
    box_h = (bottom - top) + pad_y * 2
    x0 = x
    y0 = cy - box_h // 2
    draw.rounded_rectangle([x0, y0, x0 + box_w, y0 + box_h], radius=10, fill=fill)
    draw.text((x0 + box_w // 2, cy), label, font=font, fill=CREAM, anchor="mm")
    return x0 + box_w


def generate_weekly_digest_png(*, payload: dict) -> bytes:
    """Green bulletin board with a cream content panel."""
    canvas = Image.new("RGBA", (SIZE, SIZE), GREEN)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle([0, 0, SIZE, 28], fill=RED)

    logo_bottom = paste_logo(canvas, max_size=(110, 110), y=44)
    title_font = load_font(44)
    range_font = load_font(26)
    title_y = logo_bottom + 8
    center_text(draw, "SEMANA", title_font, title_y, WHITE)

    is_thin = bool(payload.get("is_thin"))
    subtitle = (
        _upcoming_window_label(payload)
        if is_thin
        else (payload.get("competition_week_label") or payload.get("week_key", ""))
    )
    subtitle_y = title_y + text_height("Ay", title_font) + 6
    center_text(draw, subtitle, range_font, subtitle_y, WHITE)
    panel_top = max(
        PANEL_TOP_MIN,
        subtitle_y + text_height("Ay", range_font) + HEADER_TO_PANEL_GAP,
    )

    draw.rounded_rectangle(
        [PANEL_LEFT, panel_top, PANEL_RIGHT, PANEL_BOTTOM],
        radius=28,
        fill=CREAM,
    )

    if is_thin:
        _draw_thin_upcoming(draw, payload.get("upcoming_comps") or [], panel_top=panel_top)
    else:
        _draw_full_digest(draw, payload, panel_top=panel_top)

    buf = io.BytesIO()
    canvas.convert("RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _draw_full_digest(
    draw: ImageDraw.ImageDraw,
    payload: dict,
    *,
    panel_top: int,
) -> None:
    section_font = load_font(22)
    name_font = load_font(24)
    meta_font = load_font(18)
    highlight_font = load_font(20)
    badge_font = load_font(16)
    state_font = load_font(18)
    tag_font = load_font(15)

    primary = payload.get("primary_comps") or []
    late = payload.get("late_comps") or []
    upcoming = payload.get("upcoming_comps") or []
    records = payload.get("record_counts") or {}
    highlights = payload.get("record_highlights") or []
    sr_by_state = payload.get("sr_by_state") or []

    wr = int(records.get("wr") or 0)
    nar = int(records.get("nar") or 0)
    nr = int(records.get("nr") or 0)
    sr_total = int(payload.get("sr_total") or 0)
    podium_count = int(payload.get("podium_count") or 0)
    debut_count = int(payload.get("debut_count") or 0)

    # Primary first, then late. Tag only when the list is mixed.
    has_primary = bool(primary)
    has_late = bool(late)
    mixed = has_primary and has_late
    comp_rows: list[tuple[dict, str | None]] = []
    for comp in primary[:3]:
        flag = None if comp.get("has_results") else "pendientes"
        comp_rows.append((comp, flag))
    late_budget = max(0, 4 - len(comp_rows))
    for comp in late[:late_budget]:
        tag = "recién" if mixed else None
        comp_rows.append((comp, tag))

    late_only_note = has_late and not has_primary

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
    if len(tiles) > 4:
        priority = {"WR": 0, "NAR": 1, "NR": 2, "SR": 3, "Podios": 4, "Debut": 5}
        tiles = sorted(tiles, key=lambda t: priority.get(t[1], 9))[:4]

    y = panel_top + 24
    bottom_limit = PANEL_BOTTOM - 24

    # --- COMPETENCIAS ---
    if comp_rows:
        label = "RESULTADOS RECIENTES" if late_only_note else "COMPETENCIAS"
        y = _draw_section_label(draw, label, section_font, x=CONTENT_LEFT, y=y)
        for comp, tag in comp_rows:
            name_w = CONTENT_WIDTH - (100 if tag else 0)
            name = _fit_ellipsis(comp.get("name") or "", name_font, name_w)
            draw.text((CONTENT_LEFT, y), name, font=name_font, fill=BLACK)
            if tag:
                tw = text_width(tag.upper(), tag_font)
                th = text_height("Ay", tag_font)
                bx0 = CONTENT_RIGHT - tw - 20
                draw.rounded_rectangle(
                    [bx0, y + 1, CONTENT_RIGHT, y + th + 11],
                    radius=8,
                    fill=GREEN if tag == "recién" else RED,
                )
                draw.text(
                    ((bx0 + CONTENT_RIGHT) // 2, y + 6 + th // 2),
                    tag.upper(),
                    font=tag_font,
                    fill=CREAM,
                    anchor="mm",
                )
            y += text_height("Ay", name_font) + 2
            meta = _comp_meta(comp)
            if meta:
                draw.text(
                    (CONTENT_LEFT, y),
                    _fit_ellipsis(meta, meta_font, CONTENT_WIDTH),
                    font=meta_font,
                    fill=GREEN,
                )
                y += text_height("Ay", meta_font) + 10
            else:
                y += 6
        y += 4

    # --- EN NÚMEROS ---
    if tiles:
        y = _draw_section_label(
            draw, "EN NÚMEROS", section_font, x=CONTENT_LEFT, y=y
        )
        y = _draw_stat_tiles(
            draw, tiles, x0=CONTENT_LEFT, x1=CONTENT_RIGHT, y=y
        )
        if sr_total and sr_by_state:
            chip_x = CONTENT_LEFT
            chip_y = y
            chip_h = 0
            for row in sr_by_state[:3]:
                label = f"{row['state_name']} {row['count']}"
                label = _fit_ellipsis(label, state_font, 280)
                left, top, right, bottom = state_font.getbbox(label)
                pad_x, pad_y = 12, 6
                cw = (right - left) + pad_x * 2
                ch = (bottom - top) + pad_y * 2
                chip_h = ch
                if chip_x + cw > CONTENT_RIGHT:
                    break
                draw.rounded_rectangle(
                    [chip_x, chip_y, chip_x + cw, chip_y + ch],
                    radius=12,
                    outline=GREEN,
                    width=2,
                )
                draw.text(
                    (chip_x + cw // 2, chip_y + ch // 2),
                    label,
                    font=state_font,
                    fill=GREEN,
                    anchor="mm",
                )
                chip_x += cw + 10
            y = chip_y + chip_h + 18

    show_highlights = bool(highlights)
    show_upcoming = bool(upcoming)
    col_gap = 28
    mid = CONTENT_LEFT + (CONTENT_WIDTH - col_gap) // 2
    room_for_footer = bottom_limit - y

    # Prefer a two-column footer whenever both sections exist.
    if show_highlights and show_upcoming and room_for_footer >= 120:
        left_x = CONTENT_LEFT
        right_x = mid + col_gap
        left_w = mid - CONTENT_LEFT
        right_w = CONTENT_RIGHT - right_x

        # Measure footer block, then drop it into remaining space (less empty cream).
        section_h = text_height("Ay", section_font) + 8 + 4 + 16
        highlight_rows = highlights[:3]
        upcoming_rows = upcoming[:3]
        est_left = section_h
        for h in highlight_rows:
            person_lines = max(
                1,
                len(
                    _wrap_text(
                        h.get("person_name") or "",
                        highlight_font,
                        left_w - 56,
                        max_lines=2,
                    )
                ),
            )
            est_left += person_lines * (text_height("Ay", highlight_font) + 1)
            est_left += text_height("Ay", meta_font) + 12
        est_right = section_h
        for comp in upcoming_rows:
            name_lines = max(
                1,
                len(
                    _wrap_text(
                        comp.get("name") or "",
                        highlight_font,
                        right_w,
                        max_lines=2,
                    )
                ),
            )
            est_right += name_lines * (text_height("Ay", highlight_font) + 1)
            est_right += text_height("Ay", meta_font) + 12
        block_h = max(est_left, est_right)
        footer_y = y + max(0, (room_for_footer - block_h) // 2)

        y_left = _draw_section_label(
            draw, "DESTACADOS", section_font, x=left_x, y=footer_y
        )
        y_right = _draw_section_label(
            draw, "PRÓXIMAS", section_font, x=right_x, y=footer_y
        )

        for h in highlight_rows:
            if y_left > bottom_limit - 28:
                break
            level = str(h.get("level") or "")
            badge_right = _draw_level_badge(
                draw, level, badge_font, x=left_x, cy=y_left + 10
            )
            text_x = badge_right + 8
            person_w = left_x + left_w - text_x
            person_lines = _wrap_text(
                h.get("person_name") or "",
                highlight_font,
                person_w,
                max_lines=2,
            ) or ["—"]
            for line in person_lines:
                draw.text((text_x, y_left), line, font=highlight_font, fill=BLACK)
                y_left += text_height("Ay", highlight_font) + 1
            event = _fit_ellipsis(h.get("event_name") or "", meta_font, left_w)
            draw.text((left_x, y_left), event, font=meta_font, fill=GREEN)
            y_left += text_height("Ay", meta_font) + 12

        for comp in upcoming_rows:
            if y_right > bottom_limit - 28:
                break
            name_lines = _wrap_text(
                comp.get("name") or "",
                highlight_font,
                right_w,
                max_lines=2,
            ) or ["—"]
            for line in name_lines:
                draw.text((right_x, y_right), line, font=highlight_font, fill=BLACK)
                y_right += text_height("Ay", highlight_font) + 1
            meta = _comp_meta(comp)
            if meta:
                draw.text(
                    (right_x, y_right),
                    _fit_ellipsis(meta, meta_font, right_w),
                    font=meta_font,
                    fill=GREEN,
                )
                y_right += text_height("Ay", meta_font) + 12
            else:
                y_right += 8
        return

    if show_highlights and y <= bottom_limit - 70:
        y = _draw_section_label(
            draw, "DESTACADOS", section_font, x=CONTENT_LEFT, y=y
        )
        for h in highlights[:3]:
            if y > bottom_limit - 36:
                break
            level = str(h.get("level") or "")
            badge_right = _draw_level_badge(
                draw, level, badge_font, x=CONTENT_LEFT, cy=y + 10
            )
            rest = f"{h.get('person_name') or ''} · {h.get('event_name') or ''}"
            draw.text(
                (badge_right + 10, y),
                _fit_ellipsis(
                    rest.strip(" ·"),
                    highlight_font,
                    CONTENT_RIGHT - badge_right - 10,
                ),
                font=highlight_font,
                fill=BLACK,
            )
            y += text_height("Ay", highlight_font) + 12

    if show_upcoming and y <= bottom_limit - 70:
        y = _draw_section_label(
            draw, "PRÓXIMAS", section_font, x=CONTENT_LEFT, y=y
        )
        for comp in upcoming[:3]:
            if y > bottom_limit - 36:
                break
            name = _fit_ellipsis(comp.get("name") or "", name_font, CONTENT_WIDTH)
            draw.text((CONTENT_LEFT, y), name, font=name_font, fill=BLACK)
            y += text_height("Ay", name_font) + 1
            meta = _comp_meta(comp)
            if meta:
                draw.text(
                    (CONTENT_LEFT, y),
                    _fit_ellipsis(meta, meta_font, CONTENT_WIDTH),
                    font=meta_font,
                    fill=GREEN,
                )
                y += text_height("Ay", meta_font) + 10
            else:
                y += 6


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
