"""Mollerz membership (all current WCA events) and tier computation.

Mirrors apps/web/app/(root)/members/_lib/queries.ts (getMollerzMembers) and
getTier in apps/web/lib/utils.ts.
"""

from __future__ import annotations

from common import EXCLUDED_EVENTS

SPEEDSOLVING_AVERAGES_EVENTS = [
    "333",
    "222",
    "444",
    "555",
    "666",
    "777",
    "333oh",
    "clock",
    "minx",
    "skewb",
    "sq1",
    "pyram",
]
BLD_FMC_MEANS_EVENTS = ["333bf", "333fm", "444bf", "555bf"]

TIER_ORDER = ["Bronce", "Plata", "Oro", "Platino", "Ópalo", "Diamante"]
TIER_SLUGS = {
    "Bronce": "bronce",
    "Plata": "plata",
    "Oro": "oro",
    "Platino": "platino",
    "Ópalo": "opalo",
    "Diamante": "diamante",
}
SLUG_TO_TIER = {slug: tier for tier, slug in TIER_SLUGS.items()}

MOLLERZ_MEMBERS_SQL = """
    WITH current_events AS (
        SELECT id FROM events WHERE id NOT IN %(excluded)s
    )
    SELECT
        p.wca_id,
        p.name AS person_name,
        s.name AS state_name,
        COUNT(DISTINCT CASE
            WHEN r.event_id IN %(avg_events)s AND r.average > 0 THEN r.event_id
        END) AS speedsolving_averages,
        COUNT(DISTINCT CASE
            WHEN r.event_id IN %(mean_events)s AND r.average > 0 THEN r.event_id
        END) AS bld_fmc_means,
        MAX(CASE
            WHEN r.regional_single_record = 'WR' OR r.regional_average_record = 'WR'
            THEN 1 ELSE 0
        END) = 1 AS has_world_record,
        MAX(CASE
            WHEN r.pos IN (1, 2, 3) AND r.round_type_id IN ('f', 'c')
                 AND ch.championship_type = 'world'
            THEN 1 ELSE 0
        END) = 1 AS has_world_championship_podium,
        COUNT(DISTINCT CASE
            WHEN r.pos = 1 AND r.round_type_id IN ('f', 'c') THEN r.event_id
        END) AS events_won
    FROM persons p
    JOIN results r ON r.person_id = p.wca_id
    LEFT JOIN states s ON s.id = p.state_id
    LEFT JOIN championships ch ON ch.competition_id = r.competition_id
    WHERE r.event_id IN (SELECT id FROM current_events)
      AND r.best > 0
    GROUP BY p.wca_id, p.name, s.name
    HAVING COUNT(DISTINCT r.event_id) = (SELECT COUNT(*) FROM current_events)
"""


def get_tier(conditions: dict | None) -> str | None:
    if not conditions:
        return None
    fulfilled = sum(
        [
            bool(conditions.get("has_world_record")),
            bool(conditions.get("has_world_championship_podium")),
            int(conditions.get("speedsolving_averages") or 0) == len(SPEEDSOLVING_AVERAGES_EVENTS),
            int(conditions.get("bld_fmc_means") or 0) == len(BLD_FMC_MEANS_EVENTS),
            int(conditions.get("events_won") or 0) == 17,
        ]
    )
    return TIER_ORDER[fulfilled] if fulfilled < len(TIER_ORDER) else None


def tier_rank(tier: str | None) -> int:
    if tier is None or tier not in TIER_ORDER:
        return -1
    return TIER_ORDER.index(tier)


def mollerz_subject_key(wca_id: str, tier: str) -> str:
    return f"{wca_id}:{TIER_SLUGS[tier]}"


def parse_mollerz_subject_key(subject_key: str) -> tuple[str, str] | None:
    """Return (wca_id, tier) or None if the key is malformed."""
    wca_id, sep, slug = (subject_key or "").partition(":")
    tier = SLUG_TO_TIER.get(slug)
    if not sep or not wca_id or tier is None:
        return None
    return wca_id, tier


def fetch_mollerz_members(cur) -> dict[str, dict]:
    """Return wca_id → member details (name, state, conditions, tier)."""
    cur.execute(
        MOLLERZ_MEMBERS_SQL,
        {
            "excluded": tuple(EXCLUDED_EVENTS),
            "avg_events": tuple(SPEEDSOLVING_AVERAGES_EVENTS),
            "mean_events": tuple(BLD_FMC_MEANS_EVENTS),
        },
    )
    members: dict[str, dict] = {}
    for row in cur.fetchall():
        conditions = {
            "speedsolving_averages": int(row.speedsolving_averages or 0),
            "bld_fmc_means": int(row.bld_fmc_means or 0),
            "has_world_record": bool(row.has_world_record),
            "has_world_championship_podium": bool(row.has_world_championship_podium),
            "events_won": int(row.events_won or 0),
        }
        tier = get_tier(conditions)
        if tier is None:
            continue
        members[row.wca_id] = {
            "wca_id": row.wca_id,
            "person_name": row.person_name,
            "state_name": row.state_name,
            "conditions": conditions,
            "tier": tier,
        }
    return members
