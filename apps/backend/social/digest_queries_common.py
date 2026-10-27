"""Queries shared by the weekly digest and year recap payloads, over a set of competition ids."""

from __future__ import annotations

from common import OFFICIAL_EVENTS_SUBQUERY


def comp_row(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "city_name": row.city_name,
        "state_name": row.state_name,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "has_results": bool(row.has_results),
    }


def record_counts(cur, competition_ids: list[str]) -> dict:
    """WR/NAR/NR markers (single and average each count) in official events."""
    cur.execute(
        f"""
        SELECT
            SUM(
                (COALESCE(r.regional_single_record, '') = 'WR')::int
                + (COALESCE(r.regional_average_record, '') = 'WR')::int
            )::int AS wr,
            SUM(
                (COALESCE(r.regional_single_record, '') = 'NAR')::int
                + (COALESCE(r.regional_average_record, '') = 'NAR')::int
            )::int AS nar,
            SUM(
                (COALESCE(r.regional_single_record, '') = 'NR')::int
                + (COALESCE(r.regional_average_record, '') = 'NR')::int
            )::int AS nr
        FROM results r
        WHERE r.competition_id = ANY(%s)
          AND (
            r.regional_single_record IN ('NR', 'NAR', 'WR')
            OR r.regional_average_record IN ('NR', 'NAR', 'WR')
          )
          AND r.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
        """,
        (competition_ids,),
    )
    row = cur.fetchone()
    if not row:
        return {"wr": 0, "nar": 0, "nr": 0}
    return {
        "wr": int(row.wr or 0),
        "nar": int(row.nar or 0),
        "nr": int(row.nr or 0),
    }


def record_highlights(cur, competition_ids: list[str], *, newest_first: bool) -> list[dict]:
    """Top 5 records in official events, WR before NAR before NR, then by event rank."""
    newest_order = "c.start_date DESC," if newest_first else ""
    cur.execute(
        f"""
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
          AND r.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
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
            {newest_order}
            p.name
        LIMIT 5
        """,
        (competition_ids,),
    )
    return [
        {
            "person_name": r.person_name,
            "event_name": r.event_name,
            "level": r.level,
            "kind": r.kind,
            "competition_name": r.competition_name,
        }
        for r in cur.fetchall()
    ]


def podium_count(cur, competition_ids: list[str]) -> int:
    """Final-round podium places with a valid result, in official events."""
    cur.execute(
        f"""
        SELECT COUNT(*)::int AS podium_count
        FROM results r
        WHERE r.competition_id = ANY(%s)
          AND r.round_type_id IN ('f', 'c')
          AND r.pos IN (1, 2, 3)
          AND r.best > 0
          AND r.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
        """,
        (competition_ids,),
    )
    row = cur.fetchone()
    return int(row.podium_count or 0) if row else 0
