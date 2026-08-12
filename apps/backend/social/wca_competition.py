"""Fetch public WCA competition details for social captions."""

from __future__ import annotations

from datetime import datetime
from typing import Any

import requests

from common import log

WCA_COMPETITION_URL = "https://www.worldcubeassociation.org/api/v0/competitions/{competition_id}"

# Zero-decimal currencies (amount already in major units).
_ZERO_DECIMAL = {"JPY", "KRW", "CLP", "VND", "XAF", "XOF"}


def fetch_wca_competition(competition_id: str, *, timeout: int = 20) -> dict[str, Any] | None:
    """Return WCA API competition JSON, or None on failure / 404."""
    url = WCA_COMPETITION_URL.format(competition_id=competition_id)
    try:
        resp = requests.get(url, timeout=timeout)
        if resp.status_code == 404:
            log.info("WCA competition %s not found", competition_id)
            return None
        resp.raise_for_status()
        payload = resp.json()
        return payload if isinstance(payload, dict) else None
    except requests.RequestException as e:
        log.warning("Failed to fetch WCA competition %s: %s", competition_id, e)
        return None
    except ValueError as e:
        log.warning("Invalid JSON for WCA competition %s: %s", competition_id, e)
        return None


def format_entry_fee(amount: int | None, currency_code: str | None) -> str:
    if amount is None:
        return ""
    currency = (currency_code or "MXN").upper()
    if currency in _ZERO_DECIMAL:
        major = float(amount)
        return f"{major:,.0f} {currency}"
    major = amount / 100
    if currency == "MXN":
        return f"${major:,.2f} MXN"
    if currency == "USD":
        return f"US${major:,.2f}"
    return f"{major:,.2f} {currency}"


def parse_wca_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None
