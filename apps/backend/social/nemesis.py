"""Nemesis-free competitors: nobody in Mexico beats them in every slot.

Reads nemesis_stats (see apps/backend/nemesis_stats.py). The web admin panel
mirrors the same filter in getPendingNemesisPosts.
"""

from __future__ import annotations

NEMESIS_FREE_MIN_EVENTS = 3

NEMESIS_FREE_SQL = """
    SELECT
        ns.person_id AS wca_id,
        p.name AS person_name,
        s.name AS state_name,
        ns.event_count,
        ns.slot_count,
        ns.nemesized_count
    FROM nemesis_stats ns
    JOIN persons p ON p.wca_id = ns.person_id
    LEFT JOIN states s ON s.id = p.state_id
    WHERE ns.nemesis_count = 0
      AND ns.event_count >= %(min_events)s
"""


def fetch_nemesis_free(cur) -> dict[str, dict]:
    """Return wca_id → details for every nemesis-free competitor."""
    cur.execute(NEMESIS_FREE_SQL, {"min_events": NEMESIS_FREE_MIN_EVENTS})
    return {
        row.wca_id: {
            "wca_id": row.wca_id,
            "person_name": row.person_name,
            "state_name": row.state_name,
            "event_count": int(row.event_count or 0),
            "slot_count": int(row.slot_count or 0),
            "nemesized_count": int(row.nemesized_count or 0),
        }
        for row in cur.fetchall()
    }


def fetch_nemesis_free_ids(cur) -> set[str]:
    cur.execute(
        """
        SELECT person_id FROM nemesis_stats
        WHERE nemesis_count = 0 AND event_count >= %s
        """,
        (NEMESIS_FREE_MIN_EVENTS,),
    )
    return {row[0] for row in cur.fetchall()}
