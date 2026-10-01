"""Record manual publishes for any typed post (no Meta API call)."""

from __future__ import annotations

from typing import Iterable

import psycopg2.extras

from common import get_connection
from social.calendar_mx import (
    is_streaks_monthly_due,
    is_weekly_digest_due,
    is_year_recap_due,
    parse_iso_week_key,
    parse_month_key,
)
from social.mollerz import fetch_mollerz_members, parse_mollerz_subject_key
from social.nemesis import fetch_nemesis_free
from social.poster.shared import (
    POST_TYPE_MOLLERZ,
    POST_TYPE_NEMESIS,
    POST_TYPE_RECORD,
    POST_TYPE_RESULTADOS,
    POST_TYPE_STREAKS_MONTHLY,
    POST_TYPE_SUMMARY_UNLOCK,
    POST_TYPE_UPCOMING,
    POST_TYPE_WEEKLY_DIGEST,
    POST_TYPE_YEAR_RECAP,
    _already_posted,
    _competition_details,
    _record_post,
    fetch_record_markers,
)
from social.poster.summary_unlock import is_summary_year_published, parse_summary_unlock_year


def mark_typed_posted(
    post_type: str,
    subject_key: str,
    platforms: Iterable[str] | None = None,
    *,
    competition_id: str | None = None,
    external_id: str = "manual",
    require_mexico_competition: bool = False,
) -> dict:
    wanted = {p.lower() for p in (platforms or ("facebook", "instagram"))}
    wanted &= {"facebook", "instagram"}
    result = {
        "post_type": post_type,
        "subject_key": subject_key,
        "competition_id": competition_id,
        "marked": [],
        "skipped": [],
        "errors": [],
    }

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            resolved_competition_id = competition_id
            if post_type == POST_TYPE_RESULTADOS or require_mexico_competition:
                comp = _competition_details(cur, subject_key)
                if not comp:
                    result["errors"].append("competition_not_found_or_not_mexico")
                    return result
                resolved_competition_id = subject_key
            elif post_type == POST_TYPE_UPCOMING:
                comp = _competition_details(cur, subject_key)
                if not comp:
                    result["errors"].append("competition_not_found_or_not_mexico")
                    return result
                resolved_competition_id = subject_key
            elif post_type == POST_TYPE_RECORD:
                markers = fetch_record_markers(cur)
                marker = markers.get(subject_key)
                if not marker:
                    result["errors"].append("record_not_found")
                    return result
                resolved_competition_id = marker["competition_id"]
            elif post_type == POST_TYPE_SUMMARY_UNLOCK:
                year = parse_summary_unlock_year(subject_key)
                if year is None:
                    result["errors"].append("invalid_year")
                    return result
                if not is_summary_year_published(year):
                    result["errors"].append("summary_year_not_unlocked")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_WEEKLY_DIGEST:
                if parse_iso_week_key(subject_key) is None:
                    result["errors"].append("invalid_week")
                    return result
                if not is_weekly_digest_due(subject_key):
                    result["errors"].append("weekly_digest_not_due")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_STREAKS_MONTHLY:
                if parse_month_key(subject_key) is None:
                    result["errors"].append("invalid_month")
                    return result
                if not is_streaks_monthly_due(subject_key):
                    result["errors"].append("streaks_monthly_not_due")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_YEAR_RECAP:
                year = parse_summary_unlock_year(subject_key)
                if year is None:
                    result["errors"].append("invalid_year")
                    return result
                if not is_year_recap_due(year):
                    result["errors"].append("year_recap_not_due")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_MOLLERZ:
                parsed = parse_mollerz_subject_key(subject_key)
                if not parsed:
                    result["errors"].append("mollerz_member_not_found")
                    return result
                wca_id, tier = parsed
                member = fetch_mollerz_members(cur).get(wca_id)
                if not member or member["tier"] != tier:
                    result["errors"].append("mollerz_member_not_found")
                    return result
                resolved_competition_id = None
            elif post_type == POST_TYPE_NEMESIS:
                if subject_key not in fetch_nemesis_free(cur):
                    result["errors"].append("nemesis_free_not_found")
                    return result
                resolved_competition_id = None
            else:
                result["errors"].append("unsupported_post_type")
                return result

            result["competition_id"] = resolved_competition_id

            for platform in sorted(wanted):
                if _already_posted(cur, post_type, subject_key, platform):
                    result["skipped"].append(platform)
                    continue
                _record_post(
                    cur,
                    post_type=post_type,
                    subject_key=subject_key,
                    competition_id=resolved_competition_id,
                    platform=platform,
                    external_id=external_id,
                )
                result["marked"].append(platform)

    return result
