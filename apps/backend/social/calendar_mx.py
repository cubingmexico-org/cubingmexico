"""Mexico City calendar helpers for weekly digest and monthly rachas posts."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

MX_TZ = ZoneInfo("America/Mexico_City")

_ISO_WEEK_RE = re.compile(r"^(\d{4})-W(\d{2})$")
_MONTH_RE = re.compile(r"^(\d{4})-(\d{2})$")

_MONTHS_ES_SHORT = (
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
)

_MONTHS_ES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def mexico_city_now(now: datetime | None = None) -> datetime:
    if now is None:
        now = datetime.now(timezone.utc)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return now.astimezone(MX_TZ)


def mexico_city_today(now: datetime | None = None) -> date:
    return mexico_city_now(now).date()


def iso_week_key(d: date) -> str:
    year, week, _ = d.isocalendar()
    return f"{year}-W{week:02d}"


def parse_iso_week_key(raw: str) -> tuple[int, int] | None:
    match = _ISO_WEEK_RE.match((raw or "").strip())
    if not match:
        return None
    year = int(match.group(1))
    week = int(match.group(2))
    try:
        date.fromisocalendar(year, week, 1)
    except ValueError:
        return None
    return year, week


def shift_iso_week(year: int, week: int, delta_weeks: int) -> tuple[int, int]:
    monday = date.fromisocalendar(year, week, 1) + timedelta(weeks=delta_weeks)
    y, w, _ = monday.isocalendar()
    return y, w


def iso_week_bounds(year: int, week: int) -> tuple[date, date]:
    return (
        date.fromisocalendar(year, week, 1),
        date.fromisocalendar(year, week, 7),
    )


def weekly_digest_key_if_due(now: datetime | None = None) -> str | None:
    """Return the current ISO week key (Mexico City) once that Monday has begun."""
    today = mexico_city_today(now)
    return iso_week_key(today)


def is_weekly_digest_due(week_key: str, now: datetime | None = None) -> bool:
    parsed = parse_iso_week_key(week_key)
    if parsed is None:
        return False
    year, week = parsed
    monday, _ = iso_week_bounds(year, week)
    return mexico_city_today(now) >= monday


def parse_month_key(raw: str) -> tuple[int, int] | None:
    match = _MONTH_RE.match((raw or "").strip())
    if not match:
        return None
    year = int(match.group(1))
    month = int(match.group(2))
    if year < 2000 or year > 2100 or month < 1 or month > 12:
        return None
    return year, month


def month_key(d: date) -> str:
    return f"{d.year}-{d.month:02d}"


def streaks_monthly_key_if_due(now: datetime | None = None) -> str | None:
    """Return YYYY-MM for the current Mexico City month (due from day 1)."""
    return month_key(mexico_city_today(now))


def is_streaks_monthly_due(month: str, now: datetime | None = None) -> bool:
    parsed = parse_month_key(month)
    if parsed is None:
        return False
    year, mon = parsed
    today = mexico_city_today(now)
    return (today.year, today.month) >= (year, mon)


def format_day_month_short(d: date) -> str:
    return f"{d.day} {_MONTHS_ES_SHORT[d.month - 1]}"


def format_date_range_short(start: date, end: date) -> str:
    if start.year == end.year and start.month == end.month:
        return f"{start.day}–{end.day} {_MONTHS_ES_SHORT[start.month - 1]} {start.year}"
    if start.year == end.year:
        return (
            f"{format_day_month_short(start)} – "
            f"{format_day_month_short(end)} {start.year}"
        )
    return (
        f"{format_day_month_short(start)} {start.year} – "
        f"{format_day_month_short(end)} {end.year}"
    )


def format_month_label(year: int, month: int) -> str:
    return f"{_MONTHS_ES[month - 1].capitalize()} {year}"
