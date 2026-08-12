"""Query payloads for weekly digest and monthly streaks social posts."""

from __future__ import annotations

from datetime import date

from social.calendar_mx import (
    format_date_range_short,
    format_month_label,
    iso_week_bounds,
    parse_iso_week_key,
    parse_month_key,
    shift_iso_week,
)


def _comp_row(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "city_name": row.city_name,
        "state_name": row.state_name,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "has_results": bool(row.has_results),
    }


def fetch_weekly_digest_payload(cur, week_key: str) -> dict | None:
    """Build digest data for publish ISO week W (Mexico City calendar).

    Primary comps: end_date in week W-2.
    Late comps: resultados posted in week W-1 with end_date before W-2.
    Upcoming: start_date in [Monday W, Monday W + 14 days).
    """
    parsed = parse_iso_week_key(week_key)
    if parsed is None:
        return None

    year, week = parsed
    publish_monday, _ = iso_week_bounds(year, week)
    upcoming_end = date.fromordinal(publish_monday.toordinal() + 14)

    y2, w2 = shift_iso_week(year, week, -2)
    y1, w1 = shift_iso_week(year, week, -1)
    primary_start, primary_end = iso_week_bounds(y2, w2)
    late_start, late_end = iso_week_bounds(y1, w1)

    cur.execute(
        """
        SELECT
            c.id,
            c.name,
            c.city_name,
            s.name AS state_name,
            c.start_date,
            c.end_date,
            EXISTS (
                SELECT 1 FROM results r WHERE r.competition_id = c.id
            ) AS has_results
        FROM competitions c
        LEFT JOIN states s ON s.id = c.state_id
        WHERE c.country_id = 'Mexico'
          AND c.cancelled = false
          AND c.end_date::date >= %s
          AND c.end_date::date <= %s
        ORDER BY c.end_date, c.name
        """,
        (primary_start, primary_end),
    )
    primary_comps = [_comp_row(row) for row in cur.fetchall()]
    primary_ids = {c["id"] for c in primary_comps}

    cur.execute(
        """
        SELECT DISTINCT ON (c.id)
            c.id,
            c.name,
            c.city_name,
            s.name AS state_name,
            c.start_date,
            c.end_date,
            EXISTS (
                SELECT 1 FROM results r WHERE r.competition_id = c.id
            ) AS has_results
        FROM social_posts sp
        JOIN competitions c ON c.id = sp.competition_id
        LEFT JOIN states s ON s.id = c.state_id
        WHERE sp.post_type = 'resultados'
          AND c.country_id = 'Mexico'
          AND c.cancelled = false
          AND (sp.posted_at AT TIME ZONE 'America/Mexico_City')::date >= %s
          AND (sp.posted_at AT TIME ZONE 'America/Mexico_City')::date <= %s
          AND c.end_date::date < %s
        ORDER BY c.id, sp.posted_at ASC
        """,
        (late_start, late_end, primary_start),
    )
    late_comps = [
        _comp_row(row) for row in cur.fetchall() if row.id not in primary_ids
    ]

    cur.execute(
        """
        SELECT
            c.id,
            c.name,
            c.city_name,
            s.name AS state_name,
            c.start_date,
            c.end_date,
            false AS has_results
        FROM competitions c
        LEFT JOIN states s ON s.id = c.state_id
        WHERE c.country_id = 'Mexico'
          AND c.cancelled = false
          AND c.start_date::date >= %s
          AND c.start_date::date < %s
        ORDER BY c.start_date, c.name
        """,
        (publish_monday, upcoming_end),
    )
    upcoming_comps = [_comp_row(row) for row in cur.fetchall()]

    union_ids = sorted(
        {c["id"] for c in primary_comps if c["has_results"]}
        | {c["id"] for c in late_comps if c["has_results"]}
    )

    record_counts = {"wr": 0, "nar": 0, "nr": 0}
    record_highlights: list[dict] = []
    sr_total = 0
    sr_by_state: list[dict] = []
    sr_breakers: list[dict] = []
    podium_count = 0
    debut_count = 0
    debuts: list[dict] = []

    if union_ids:
        cur.execute(
            """
            SELECT
                SUM(
                    (r.regional_single_record = 'WR')::int
                    + (r.regional_average_record = 'WR')::int
                )::int AS wr,
                SUM(
                    (r.regional_single_record = 'NAR')::int
                    + (r.regional_average_record = 'NAR')::int
                )::int AS nar,
                SUM(
                    (r.regional_single_record = 'NR')::int
                    + (r.regional_average_record = 'NR')::int
                )::int AS nr
            FROM results r
            WHERE r.competition_id = ANY(%s)
              AND (
                r.regional_single_record IN ('NR', 'NAR', 'WR')
                OR r.regional_average_record IN ('NR', 'NAR', 'WR')
              )
            """,
            (union_ids,),
        )
        row = cur.fetchone()
        if row:
            record_counts = {
                "wr": int(row.wr or 0),
                "nar": int(row.nar or 0),
                "nr": int(row.nr or 0),
            }

        cur.execute(
            """
            SELECT
                p.name AS person_name,
                e.name AS event_name,
                CASE
                    WHEN r.regional_single_record IN ('NR', 'NAR', 'WR')
                        THEN r.regional_single_record
                    ELSE r.regional_average_record
                END AS level,
                CASE
                    WHEN r.regional_single_record IN ('NR', 'NAR', 'WR')
                        THEN 'single'
                    ELSE 'average'
                END AS kind,
                c.name AS competition_name
            FROM results r
            JOIN persons p ON p.wca_id = r.person_id
            JOIN events e ON e.id = r.event_id
            JOIN competitions c ON c.id = r.competition_id
            WHERE r.competition_id = ANY(%s)
              AND (
                r.regional_single_record IN ('NR', 'NAR', 'WR')
                OR r.regional_average_record IN ('NR', 'NAR', 'WR')
              )
            ORDER BY
                CASE
                    WHEN COALESCE(
                        NULLIF(r.regional_single_record, ''),
                        NULLIF(r.regional_average_record, '')
                    ) = 'WR' THEN 0
                    WHEN COALESCE(
                        NULLIF(r.regional_single_record, ''),
                        NULLIF(r.regional_average_record, '')
                    ) = 'NAR' THEN 1
                    ELSE 2
                END,
                e.rank,
                p.name
            LIMIT 5
            """,
            (union_ids,),
        )
        record_highlights = [
            {
                "person_name": r.person_name,
                "event_name": r.event_name,
                "level": r.level,
                "kind": r.kind,
                "competition_name": r.competition_name,
            }
            for r in cur.fetchall()
        ]

        cur.execute(
            """
            SELECT
                SUM(
                    (r.state_single_record = 'SR')::int
                    + (r.state_average_record = 'SR')::int
                )::int AS sr_total
            FROM results r
            WHERE r.competition_id = ANY(%s)
              AND (r.state_single_record = 'SR' OR r.state_average_record = 'SR')
            """,
            (union_ids,),
        )
        sr_row = cur.fetchone()
        sr_total = int(sr_row.sr_total or 0) if sr_row else 0

        cur.execute(
            """
            SELECT
                COALESCE(s.name, 'Sin estado') AS state_name,
                SUM(
                    (r.state_single_record = 'SR')::int
                    + (r.state_average_record = 'SR')::int
                )::int AS sr_count
            FROM results r
            JOIN persons p ON p.wca_id = r.person_id
            LEFT JOIN states s ON s.id = p.state_id
            WHERE r.competition_id = ANY(%s)
              AND (r.state_single_record = 'SR' OR r.state_average_record = 'SR')
            GROUP BY s.name
            ORDER BY sr_count DESC, state_name
            LIMIT 5
            """,
            (union_ids,),
        )
        sr_by_state = [
            {"state_name": r.state_name, "count": int(r.sr_count)}
            for r in cur.fetchall()
        ]

        cur.execute(
            """
            SELECT
                p.name AS person_name,
                COALESCE(s.name, 'Sin estado') AS state_name,
                SUM(
                    (r.state_single_record = 'SR')::int
                    + (r.state_average_record = 'SR')::int
                )::int AS sr_count
            FROM results r
            JOIN persons p ON p.wca_id = r.person_id
            LEFT JOIN states s ON s.id = p.state_id
            WHERE r.competition_id = ANY(%s)
              AND (r.state_single_record = 'SR' OR r.state_average_record = 'SR')
            GROUP BY p.name, s.name
            ORDER BY sr_count DESC, p.name
            LIMIT 5
            """,
            (union_ids,),
        )
        sr_breakers = [
            {
                "person_name": r.person_name,
                "state_name": r.state_name,
                "count": int(r.sr_count),
            }
            for r in cur.fetchall()
        ]

        cur.execute(
            """
            SELECT COUNT(*)::int AS podium_count
            FROM results r
            WHERE r.competition_id = ANY(%s)
              AND r.round_type_id IN ('f', 'c')
              AND r.pos IN (1, 2, 3)
              AND r.best > 0
            """,
            (union_ids,),
        )
        podium_row = cur.fetchone()
        podium_count = int(podium_row.podium_count or 0) if podium_row else 0

        cur.execute(
            """
            WITH first_comp AS (
                SELECT
                    r.person_id,
                    MIN(c.start_date) AS first_start,
                    (ARRAY_AGG(c.id ORDER BY c.start_date, c.id))[1]
                        AS first_competition_id
                FROM results r
                JOIN competitions c ON c.id = r.competition_id
                GROUP BY r.person_id
            )
            SELECT
                p.wca_id AS person_id,
                p.name AS person_name,
                s.name AS state_name,
                c.id AS competition_id,
                c.name AS competition_name
            FROM first_comp fc
            JOIN persons p ON p.wca_id = fc.person_id
            LEFT JOIN states s ON s.id = p.state_id
            JOIN competitions c ON c.id = fc.first_competition_id
            WHERE c.id = ANY(%s)
            ORDER BY p.name
            """,
            (union_ids,),
        )
        debuts = [
            {
                "person_id": r.person_id,
                "person_name": r.person_name,
                "state_name": r.state_name,
                "competition_id": r.competition_id,
                "competition_name": r.competition_name,
            }
            for r in cur.fetchall()
        ]
        debut_count = len(debuts)

    is_empty = (
        not primary_comps and not late_comps and not upcoming_comps
    )

    return {
        "week_key": week_key,
        "publish_monday": publish_monday,
        "primary_start": primary_start,
        "primary_end": primary_end,
        "competition_week_label": format_date_range_short(
            primary_start, primary_end
        ),
        "primary_comps": primary_comps,
        "late_comps": late_comps,
        "upcoming_comps": upcoming_comps,
        "record_counts": record_counts,
        "record_highlights": record_highlights,
        "sr_total": sr_total,
        "sr_by_state": sr_by_state,
        "sr_breakers": sr_breakers,
        "podium_count": podium_count,
        "debut_count": debut_count,
        "debuts": debuts[:8],
        "is_empty": is_empty,
        "is_thin": (
            not primary_comps
            and not late_comps
            and bool(upcoming_comps)
        ),
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
        ORDER BY sr.current_streak DESC, sr.longest_streak DESC, sr.person_id
        LIMIT 5
        """
    )
    top_current = [
        {
            "rank": int(r.rank),
            "person_id": r.person_id,
            "person_name": r.person_name,
            "state_name": r.state_name,
            "current_streak": int(r.current_streak),
            "longest_streak": int(r.longest_streak),
        }
        for r in cur.fetchall()
    ]

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
        ORDER BY sr.longest_streak DESC, sr.current_streak DESC, sr.person_id
        LIMIT 1
        """
    )
    longest_row = cur.fetchone()
    longest = None
    if longest_row:
        longest = {
            "rank": int(longest_row.rank),
            "person_id": longest_row.person_id,
            "person_name": longest_row.person_name,
            "state_name": longest_row.state_name,
            "current_streak": int(longest_row.current_streak),
            "longest_streak": int(longest_row.longest_streak),
        }

    longest_callout = None
    if longest and (
        not top_current or longest["person_id"] != top_current[0]["person_id"]
    ):
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
