"""Query payload for the year recap social post."""

from __future__ import annotations

from datetime import date

from common import OFFICIAL_EVENTS_SUBQUERY
from social.digest_queries_common import podium_count, record_counts, record_highlights


def fetch_year_recap_payload(cur, year: int) -> dict:
    """National Cubing México stats for Mexican competitions starting in ``year``."""
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)

    cur.execute(
        """
        SELECT
            c.id,
            c.city_name,
            s.name AS state_name,
            EXISTS (
                SELECT 1 FROM results r WHERE r.competition_id = c.id
            ) AS has_results
        FROM competitions c
        LEFT JOIN states s ON s.id = c.state_id
        WHERE c.country_id = 'Mexico'
          AND c.cancelled = false
          AND c.start_date::date >= %s
          AND c.start_date::date <= %s
        """,
        (year_start, year_end),
    )
    comps = cur.fetchall()
    comp_count = len(comps)
    state_counts: dict[str, int] = {}
    cities: set[str] = set()
    for row in comps:
        state = (row.state_name or "").strip()
        if state:
            state_counts[state] = state_counts.get(state, 0) + 1
        city = (row.city_name or "").strip().lower()
        if city:
            cities.add(city)
    top_states = [
        {"state_name": name, "count": count}
        for name, count in sorted(state_counts.items(), key=lambda item: (-item[1], item[0]))[:5]
    ]
    ids = sorted(row.id for row in comps if row.has_results)

    competitor_count = 0
    debut_count = 0
    records = {"wr": 0, "nar": 0, "nr": 0}
    highlights: list[dict] = []
    sr_total = 0
    sr_breakers: list[dict] = []
    podiums = 0
    busiest: dict | None = None

    if ids:
        cur.execute(
            """
            SELECT COUNT(DISTINCT r.person_id)::int AS n
            FROM results r
            WHERE r.competition_id = ANY(%s)
            """,
            (ids,),
        )
        row = cur.fetchone()
        competitor_count = int(row.n or 0) if row else 0

        cur.execute(
            """
            WITH first_comp AS (
                SELECT
                    r.person_id,
                    (ARRAY_AGG(c.id ORDER BY c.start_date, c.id))[1]
                        AS first_competition_id
                FROM results r
                JOIN competitions c ON c.id = r.competition_id
                GROUP BY r.person_id
            )
            SELECT COUNT(*)::int AS n
            FROM first_comp fc
            WHERE fc.first_competition_id = ANY(%s)
            """,
            (ids,),
        )
        row = cur.fetchone()
        debut_count = int(row.n or 0) if row else 0

        records = record_counts(cur, ids)
        highlights = record_highlights(cur, ids, newest_first=True)

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
            GROUP BY p.wca_id, p.name, s.name
            ORDER BY sr_count DESC, p.name
            """,
            (ids,),
        )
        sr_rows = cur.fetchall()
        sr_total = sum(int(r.sr_count or 0) for r in sr_rows)
        sr_breakers = [
            {
                "person_name": r.person_name,
                "state_name": r.state_name,
                "count": int(r.sr_count or 0),
            }
            for r in sr_rows[:3]
        ]

        podiums = podium_count(cur, ids)

        cur.execute(
            """
            SELECT
                p.name AS person_name,
                s.name AS state_name,
                COUNT(DISTINCT r.competition_id)::int AS comp_count
            FROM results r
            JOIN persons p ON p.wca_id = r.person_id
            LEFT JOIN states s ON s.id = p.state_id
            WHERE r.competition_id = ANY(%s)
            GROUP BY p.wca_id, p.name, s.name
            ORDER BY comp_count DESC, p.name
            LIMIT 1
            """,
            (ids,),
        )
        row = cur.fetchone()
        if row:
            busiest = {
                "person_name": row.person_name,
                "state_name": row.state_name,
                "count": int(row.comp_count or 0),
            }

    return {
        "year": year,
        "next_year": year + 1,
        "comp_count": comp_count,
        "state_count": len(state_counts),
        "city_count": len(cities),
        "top_states": top_states,
        "competitor_count": competitor_count,
        "debut_count": debut_count,
        "record_counts": records,
        "record_highlights": highlights,
        "sr_total": sr_total,
        "sr_breakers": sr_breakers,
        "podium_count": podiums,
        "busiest_competitor": busiest,
        "is_empty": comp_count == 0,
    }
