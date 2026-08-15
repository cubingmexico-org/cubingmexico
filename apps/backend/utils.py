import logging
import math
import os
import re
from datetime import datetime

from flask import request
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

log = logging.getLogger("common")

# Set SKIP_GEOCODING=true for local imports (Nominatim rate-limits bulk reverse geocoding).
SKIP_GEOCODING = os.environ.get("SKIP_GEOCODING", "").strip().lower() in {
    "1",
    "true",
    "yes",
}

_geolocator = None
_reverse = None
_skip_logged = False


def _get_reverse():
    """Lazy Nominatim client with ~1 req/s rate limit (OSM usage policy)."""
    global _geolocator, _reverse
    if _reverse is None:
        _geolocator = Nominatim(user_agent="cubing-mexico-web-backend", timeout=10)
        _reverse = RateLimiter(
            _geolocator.reverse,
            min_delay_seconds=1.1,
            max_retries=2,
            error_wait_seconds=5.0,
        )
    return _reverse


def get_state_from_coordinates(latitude, longitude):
    global _skip_logged
    if SKIP_GEOCODING:
        if not _skip_logged:
            log.info(
                "SKIP_GEOCODING enabled — Mexican competition state_id will be left null"
            )
            _skip_logged = True
        return None

    try:
        location = _get_reverse()(
            (latitude, longitude),
            addressdetails=True,
            language="es",
        )
        if location and "address" in location.raw:
            # Return state if available, otherwise default to "Ciudad de México"
            return location.raw["address"].get("state") or "Ciudad de México"
        return None
    except Exception as e:
        log.warning("Geocoding failed for (%s, %s): %s", latitude, longitude, e)
        return None


def to_camel_case(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

def convert_keys_to_camel_case(data):
    if isinstance(data, dict):
        return {to_camel_case(k): convert_keys_to_camel_case(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [convert_keys_to_camel_case(item) for item in data]
    return data


def get_year_from_competition_id(competition_id: str):
    if not isinstance(competition_id, str):
        return None

    match = re.search(r"([12]\d{3})$", competition_id)
    if match:
        return int(match.group(1))

    return None


def _find_markdown_link_url_end(text: str, url_start: int) -> int:
    """Closing `)` of a Markdown link destination, allowing nested parentheses."""
    depth = 0
    for i in range(url_start, len(text)):
        ch = text[i]
        if ch == "(":
            depth += 1
            continue
        if ch == ")":
            if depth == 0:
                return i
            depth -= 1
            continue
        if ch == "\n":
            return -1
    return -1


def extract_first_image_url(information) -> str | None:
    """
    Extract the first Markdown image URL from competition information text.
    Mirrors apps/web/lib/competition-logo.ts (handles nested parens in filenames).
    """
    if information is None:
        return None
    if isinstance(information, float):
        # pandas empty cells often become NaN
        if math.isnan(information):
            return None
        information = str(information)

    if not isinstance(information, str):
        information = str(information)

    text = information.strip()
    if not text or text.lower() == "nan":
        return None

    marker = "!["
    search_from = 0
    while search_from < len(text):
        bang_index = text.find(marker, search_from)
        if bang_index == -1:
            return None

        after_alt_start = bang_index + len(marker)
        alt_end = text.find("](", after_alt_start)
        if alt_end == -1:
            return None

        url_start = alt_end + 2
        url_end = _find_markdown_link_url_end(text, url_start)
        if url_end == -1:
            search_from = url_start
            continue

        url = text[url_start:url_end].strip()
        if url:
            return url

        search_from = url_end + 1

    return None


def parse_int_query_param(param_name, default_value, min_value=1, max_value=None):
    raw_value = request.args.get(param_name, default_value)
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid '{param_name}'. Must be an integer.")

    if value < min_value:
        raise ValueError(f"Invalid '{param_name}'. Must be greater than or equal to {min_value}.")

    if max_value is not None and value > max_value:
        raise ValueError(f"Invalid '{param_name}'. Must be less than or equal to {max_value}.")

    return value


def parse_int_query_param_or_default(param_name, default_value, min_value=None, max_value=None):
    raw_value = request.args.get(param_name, default_value)
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return default_value

    if min_value is not None and value < min_value:
        return min_value

    if max_value is not None and value > max_value:
        return max_value

    return value


def parse_date_query_param(param_name):
    raw_value = request.args.get(param_name)
    if not raw_value:
        return None

    try:
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Invalid '{param_name}'. Expected format: YYYY-MM-DD.")


def parse_bool_query_param(param_name):
    raw_value = request.args.get(param_name)
    if raw_value is None:
        return None

    normalized = raw_value.strip().lower()
    if normalized in ["true", "1", "yes"]:
        return True
    if normalized in ["false", "0", "no"]:
        return False

    raise ValueError(f"Invalid '{param_name}'. Expected one of: true, false, 1, 0, yes, no.")


def build_competitions_filter_query_parts():
    where_clauses = ["c.country_id = %s"]
    query_params = ["Mexico"]

    state_id = request.args.get("stateId") or request.args.get("state_id")
    if state_id:
        state_id = state_id.strip()
    if state_id:
        where_clauses.append("c.state_id = %s")
        query_params.append(state_id)

    event_id = request.args.get("event_id") or request.args.get("eventId")
    if event_id:
        where_clauses.append(
            "EXISTS (SELECT 1 FROM competition_events ce WHERE ce.competition_id = c.id AND ce.event_id = %s)"
        )
        query_params.append(event_id)

    year = request.args.get("year")
    if year:
        try:
            year_int = int(year)
        except ValueError:
            raise ValueError("Invalid 'year'. Must be an integer.")
        where_clauses.append("EXTRACT(YEAR FROM c.start_date) = %s")
        query_params.append(year_int)

    start_date = parse_date_query_param("start_date")
    if start_date:
        where_clauses.append("c.start_date >= %s")
        query_params.append(start_date)

    end_date = parse_date_query_param("end_date")
    if end_date:
        where_clauses.append("c.end_date <= %s")
        query_params.append(end_date)

    search = request.args.get("search")
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        where_clauses.append("(c.name ILIKE %s OR c.city_name ILIKE %s)")
        query_params.extend([search_term, search_term])

    cancelled = parse_bool_query_param("cancelled")
    if cancelled is not None:
        where_clauses.append("c.cancelled = %s")
        query_params.append(cancelled)

    return where_clauses, query_params
