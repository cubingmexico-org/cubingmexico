"""Query payload for the monthly streaks social post."""

from __future__ import annotations

from social.calendar_mx import format_month_label, parse_month_key


def _streak_entry(row) -> dict:
    return {
        "rank": int(row.rank),
        "person_id": row.person_id,
        "person_name": row.person_name,
        "state_name": row.state_name,
        "current_streak": int(row.current_streak),
        "longest_streak": int(row.longest_streak),
    }


def fetch_streaks_monthly_payload(cur, month_key_str: str) -> dict | None:
    parsed = parse_month_key(month_key_str)
    if parsed is None:
        return None
    year, month = parsed

    cur.execute(
        """
        SELECT
            sr.rank,
            sr.person_id,
            p.name AS person_name,
            s.name AS state_name,
            sr.current_streak,
            sr.longest_streak
        FROM streak_ranks sr
        JOIN persons p ON p.wca_id = sr.person_id
        LEFT JOIN states s ON s.id = p.state_id
        WHERE sr.scope = 'official'
        ORDER BY sr.current_streak DESC, sr.longest_streak DESC, sr.person_id
        LIMIT 5
        """
    )
    top_current = [_streak_entry(r) for r in cur.fetchall()]

    cur.execute(
        """
        SELECT
            sr.rank,
            sr.person_id,
            p.name AS person_name,
            s.name AS state_name,
            sr.current_streak,
            sr.longest_streak
        FROM streak_ranks sr
        JOIN persons p ON p.wca_id = sr.person_id
        LEFT JOIN states s ON s.id = p.state_id
        WHERE sr.scope = 'official'
        ORDER BY sr.longest_streak DESC, sr.current_streak DESC, sr.person_id
        LIMIT 1
        """
    )
    longest_row = cur.fetchone()
    longest = _streak_entry(longest_row) if longest_row else None

    longest_callout = None
    if longest and (not top_current or longest["person_id"] != top_current[0]["person_id"]):
        longest_callout = longest

    return {
        "month_key": month_key_str,
        "year": year,
        "month": month,
        "month_label": format_month_label(year, month),
        "top_current": top_current,
        "longest_callout": longest_callout,
        "is_empty": len(top_current) == 0,
    }
