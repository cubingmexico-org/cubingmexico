"""Query payload for the weekly digest social post."""

from __future__ import annotations

from datetime import date

from common import OFFICIAL_EVENTS_SUBQUERY
from social.calendar_mx import (
    format_date_range_short,
    iso_week_bounds,
    parse_iso_week_key,
    shift_iso_week,
)
from social.digest_queries_common import comp_row, podium_count, record_counts, record_highlights


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
    primary_comps = [comp_row(row) for row in cur.fetchall()]
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
    late_comps = [comp_row(row) for row in cur.fetchall() if row.id not in primary_ids]

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
    upcoming_comps = [comp_row(row) for row in cur.fetchall()]

    union_ids = sorted(
        {c["id"] for c in primary_comps if c["has_results"]} | {c["id"] for c in late_comps if c["has_results"]}
    )

    records = {"wr": 0, "nar": 0, "nr": 0}
    highlights: list[dict] = []
    sr_total = 0
    sr_by_state: list[dict] = []
    sr_breakers: list[dict] = []
    podiums = 0
    debuts: list[dict] = []

    if union_ids:
        records = record_counts(cur, union_ids)
        highlights = record_highlights(cur, union_ids, newest_first=False)

        cur.execute(
            f"""
            SELECT
                SUM(
                    (COALESCE(r.state_single_record, '') = 'SR')::int
                    + (COALESCE(r.state_average_record, '') = 'SR')::int
                )::int AS sr_total
            FROM results r
            WHERE r.competition_id = ANY(%s)
              AND (r.state_single_record = 'SR' OR r.state_average_record = 'SR')
              AND r.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
            """,
            (union_ids,),
        )
        sr_row = cur.fetchone()
        sr_total = int(sr_row.sr_total or 0) if sr_row else 0

        cur.execute(
            f"""
            SELECT
                COALESCE(s.name, 'Sin estado') AS state_name,
                SUM(
                    (COALESCE(r.state_single_record, '') = 'SR')::int
                    + (COALESCE(r.state_average_record, '') = 'SR')::int
                )::int AS sr_count
            FROM results r
            JOIN persons p ON p.wca_id = r.person_id
            LEFT JOIN states s ON s.id = p.state_id
            WHERE r.competition_id = ANY(%s)
              AND (r.state_single_record = 'SR' OR r.state_average_record = 'SR')
              AND r.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
            GROUP BY s.name
            ORDER BY sr_count DESC, state_name
            LIMIT 5
            """,
            (union_ids,),
        )
        sr_by_state = [{"state_name": r.state_name, "count": int(r.sr_count or 0)} for r in cur.fetchall()]

        cur.execute(
            f"""
            SELECT
                p.name AS person_name,
                COALESCE(s.name, 'Sin estado') AS state_name,
                SUM(
                    (COALESCE(r.state_single_record, '') = 'SR')::int
                    + (COALESCE(r.state_average_record, '') = 'SR')::int
                )::int AS sr_count
            FROM results r
            JOIN persons p ON p.wca_id = r.person_id
            LEFT JOIN states s ON s.id = p.state_id
            WHERE r.competition_id = ANY(%s)
              AND (r.state_single_record = 'SR' OR r.state_average_record = 'SR')
              AND r.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
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
                "count": int(r.sr_count or 0),
            }
            for r in cur.fetchall()
        ]

        podiums = podium_count(cur, union_ids)

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

    is_empty = not primary_comps and not late_comps and not upcoming_comps

    return {
        "week_key": week_key,
        "publish_monday": publish_monday,
        "primary_start": primary_start,
        "primary_end": primary_end,
        "competition_week_label": format_date_range_short(primary_start, primary_end),
        "primary_comps": primary_comps,
        "late_comps": late_comps,
        "upcoming_comps": upcoming_comps,
        "record_counts": records,
        "record_highlights": highlights,
        "sr_total": sr_total,
        "sr_by_state": sr_by_state,
        "sr_breakers": sr_breakers,
        "podium_count": podiums,
        "debut_count": len(debuts),
        "debuts": debuts[:8],
        "is_empty": is_empty,
        "is_thin": (not primary_comps and not late_comps and bool(upcoming_comps)),
    }
