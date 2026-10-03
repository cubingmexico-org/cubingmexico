"""Payload helpers, cover story and slide planning for the SEMANA weekly digest."""

from __future__ import annotations

from datetime import date, datetime

from social.calendar_mx import format_date_range_short, format_day_month_short
from social.image_common import (
    format_place_line,
)

SLIDE_TITLES = {
    "cover": "Portada",
    "competencias": "Competencias",
    "numeros": "En números",
    "debutantes": "Bienvenidos",
    "destacados": "Destacados",
    "proximas": "Próximas",
}


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


RECORD_KICKERS = {
    "WR": "RÉCORD MUNDIAL",
    "NAR": "RÉCORD CONTINENTAL",
    "NR": "RÉCORD NACIONAL",
}


KIND_ES = {"single": "single", "average": "promedio"}


def _stats_line(payload: dict) -> str:
    bits = []
    for value, label in _stat_tiles(payload, limit=6):
        shown = label if label in {"WR", "NAR", "NR", "SR"} else label.lower()
        bits.append(f"{value} {shown}")
    return " · ".join(bits)


def _states_phrase(comps: list[dict]) -> str:
    states = sorted({(c.get("state_name") or "").strip() for c in comps} - {""})
    if len(states) == 1:
        return f"en {states[0]}"
    if len(states) > 1:
        return f"en {len(states)} estados"
    return ""


def weekly_cover_story(payload: dict) -> dict | None:
    """Pick the week's lead story for the cover and caption opener.

    Returns {kind, kicker, headline, sub, caption} or None on thin/empty weeks.
    """
    if payload.get("is_thin") or payload.get("is_empty"):
        return None

    rows, _ = _comp_rows(payload)
    single_comp = rows[0][0] if len(rows) == 1 else None

    highlights = payload.get("record_highlights") or []
    if highlights:
        h = highlights[0]
        level = str(h.get("level") or "").upper()
        event = h.get("event_name") or ""
        kind = KIND_ES.get(h.get("kind") or "", h.get("kind") or "")
        person = h.get("person_name") or ""
        sub_bits = [f"{event} {kind}".strip()]
        if not single_comp and h.get("competition_name"):
            sub_bits.append(h["competition_name"])
        extra = len(highlights) - 1
        caption = f"¡{level} en {event} {kind} para {person}!".replace("  ", " ")
        if extra > 0:
            caption += f" Y {extra} récord{'s' if extra != 1 else ''} más."
        return {
            "kind": "record",
            "kicker": RECORD_KICKERS.get(level, level),
            "headline": person,
            "sub": " · ".join(b for b in sub_bits if b),
            "caption": caption,
        }

    breakers = payload.get("sr_breakers") or []
    if breakers and int(breakers[0].get("count") or 0) >= 3:
        b = breakers[0]
        count = int(b.get("count") or 0)
        person = b.get("person_name") or ""
        state = (b.get("state_name") or "").strip()
        caption = f"{person} rompió {count} récords estatales"
        caption += f" de {state}." if state and state != "Sin estado" else "."
        return {
            "kind": "sr",
            "kicker": f"{count} RÉCORDS ESTATALES",
            "headline": person,
            "sub": state if state != "Sin estado" else "",
            "caption": caption,
        }

    debut_count = int(payload.get("debut_count") or 0)
    if debut_count:
        noun = "nuevo cubero" if debut_count == 1 else "nuevos cuberos"
        return {
            "kind": "debut",
            "kicker": "BIENVENIDOS",
            "headline": f"{debut_count} {noun}",
            "sub": "",
            "caption": f"¡Bienvenida a {'nuestro' if debut_count == 1 else 'los'} {debut_count} {noun}!",
        }

    if single_comp:
        return {
            "kind": "comp",
            "kicker": "COMPETENCIA",
            "headline": single_comp.get("name") or "",
            "sub": _comp_meta(single_comp),
            "caption": f"Así se vivió {single_comp.get('name') or 'la competencia'}.",
        }
    if rows:
        comps = [c for c, _ in rows]
        where = _states_phrase(comps)
        return {
            "kind": "comp",
            "kicker": "COMPETENCIAS",
            "headline": f"{len(comps)} competencias {where}".strip(),
            "sub": "",
            "caption": f"{len(comps)} competencias {where} esta semana.".replace("  ", " "),
        }
    return None


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


MAX_SLIDES = 5


UPCOMING_FOOTER_MAX = 2


def _plan_ids(payload: dict) -> tuple[list[str], str | None]:
    """Return (slide ids, inner slide id that carries the PRÓXIMAS footer)."""
    if payload.get("is_empty"):
        return [], None

    upcoming = payload.get("upcoming_comps") or []
    if payload.get("is_thin"):
        return (["cover", "proximas"] if upcoming else ["cover"]), None

    inner: list[str] = []
    rows, _ = _comp_rows(payload)
    # A single competition is already named on the cover.
    if len(rows) > 1:
        inner.append("competencias")
    if _has_numeros(payload):
        inner.append("numeros")
    if payload.get("debuts"):
        inner.append("debutantes")
    if payload.get("record_highlights"):
        inner.append("destacados")
    inner = inner[: MAX_SLIDES - 1]

    footer_slide = None
    if upcoming:
        fits_footer = len(upcoming) <= UPCOMING_FOOTER_MAX
        no_room = len(inner) >= MAX_SLIDES - 1
        if inner and (fits_footer or no_room):
            footer_slide = inner[-1]
        else:
            inner.append("proximas")
    return ["cover", *inner], footer_slide


def plan_weekly_digest_slides(payload: dict) -> list[dict]:
    """Return ordered slide descriptors: {id, title}. Cap at 5."""
    ids, _ = _plan_ids(payload)
    return [{"id": slide_id, "title": SLIDE_TITLES[slide_id]} for slide_id in ids]
