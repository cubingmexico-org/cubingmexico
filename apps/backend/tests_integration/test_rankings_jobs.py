import json
from datetime import date
from pathlib import Path

import psycopg2.extensions
import pytest

from routes.admin.rankings import _compute_nemesis_stats
from tests_integration.factories import (
    AUTH_HEADERS,
    fetch_all,
    insert_competition,
    insert_event,
    insert_person,
    insert_rank,
    insert_result,
)

A, B, C = "2020AAAA01", "2020BBBB01", "2020CCCC01"
PARITY_FIXTURE = Path(__file__).resolve().parents[3] / "fixtures" / "parity" / "nemesis.json"


def _by_scope(rows, *keys):
    out = {}
    for row in rows:
        out.setdefault(row["scope"], {})[row["person_id"]] = tuple(row[k] for k in keys)
    return out


def test_update_sum_of_ranks(client, db):
    insert_event(db, "333", 10)
    insert_event(db, "222", 20)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    for wca_id in (A, B, C):
        insert_person(db, wca_id)

    insert_rank(db, "single", A, "333", 800, country_rank=1)
    insert_rank(db, "single", B, "333", 900, country_rank=2)
    insert_rank(db, "single", B, "222", 300, country_rank=1)
    insert_rank(db, "single", C, "222", 400, country_rank=2)
    insert_rank(db, "single", B, "333ft", 2500, country_rank=2)
    insert_rank(db, "single", C, "333ft", 2000, country_rank=1)
    # Would change every total if `fto` were counted.
    insert_rank(db, "single", A, "fto", 100, country_rank=1)
    insert_rank(db, "average", A, "333", 1000, country_rank=1)

    response = client.post("/update-sum-of-ranks", headers=AUTH_HEADERS)
    assert response.status_code == 200, response.get_json()

    rows = fetch_all(db, "SELECT * FROM sum_of_ranks WHERE result_type = 'single'")
    # Missing events count as that event's worst country rank + 1 (3 for each event here).
    assert _by_scope(rows, "rank", "overall") == {
        "official": {B: (1, 3), A: (2, 4), C: (3, 5)},
        "all": {B: (1, 5), C: (2, 6), A: (3, 7)},
    }

    a_official = next(r for r in rows if r["person_id"] == A and r["scope"] == "official")
    assert sorted(a_official["events"], key=lambda e: e["eventId"]) == [
        {"eventId": "222", "countryRank": 3, "completed": False},
        {"eventId": "333", "countryRank": 1, "completed": True},
    ]
    for row in rows:
        event_ids = {e["eventId"] for e in row["events"]}
        assert "fto" not in event_ids
        assert ("333ft" in event_ids) == (row["scope"] == "all")

    averages = fetch_all(db, "SELECT * FROM sum_of_ranks WHERE result_type = 'average' AND scope = 'official'")
    assert {r["person_id"]: r["overall"] for r in averages} == {A: 1, B: 2, C: 2}
    assert next(r["rank"] for r in averages if r["person_id"] == A) == 1


def test_update_kinch_ranks(client, db):
    insert_event(db, "333", 10)
    insert_event(db, "333bf", 50)
    insert_event(db, "333ft", 996)
    insert_event(db, "333mbo", 995)
    insert_event(db, "fto", 810)
    insert_person(db, A)
    insert_person(db, B)

    insert_rank(db, "average", A, "333", 1000, country_rank=1)
    insert_rank(db, "average", B, "333", 2000, country_rank=2)
    insert_rank(db, "single", A, "333bf", 3000, country_rank=1)
    insert_rank(db, "single", B, "333bf", 4000, country_rank=2)
    insert_rank(db, "average", B, "333ft", 1500, country_rank=1)
    insert_rank(db, "single", A, "333mbo", 990100000, country_rank=1)
    insert_rank(db, "average", A, "fto", 100, country_rank=1)

    response = client.post("/update-kinch-ranks", headers=AUTH_HEADERS)
    assert response.status_code == 200, response.get_json()

    rows = fetch_all(db, "SELECT * FROM kinch_ranks")
    ranks = _by_scope(rows, "rank", "overall")
    # Official: A = (100 + 100) / 2, B = (50 + 75) / 2.
    assert ranks["official"] == {A: (1, pytest.approx(100)), B: (2, pytest.approx(62.5))}
    # All adds 333ft, where only B has a result: A = 200 / 3, B = 225 / 3.
    assert ranks["all"] == {B: (1, pytest.approx(75)), A: (2, pytest.approx(200 / 3))}

    for row in rows:
        event_ids = {e["eventId"] for e in row["events"]}
        expected = {"333", "333bf"} | ({"333ft"} if row["scope"] == "all" else set())
        assert event_ids == expected


def test_update_streak_ranks(client, db):
    insert_event(db, "333", 10)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    insert_person(db, A)
    insert_person(db, B)
    for month in range(1, 6):
        insert_competition(db, f"Comp{month}", date(2024, month, 10))

    # A: PR, no PR, PR, PR only in 333ft, PR.
    insert_result(db, "a1", "Comp1", "333", A, best=1000)
    insert_result(db, "a2", "Comp2", "333", A, best=1100)
    insert_result(db, "a3", "Comp3", "333", A, best=900)
    insert_result(db, "a4", "Comp4", "333", A, best=950)
    insert_result(db, "a4ft", "Comp4", "333ft", A, best=2000)
    insert_result(db, "a5", "Comp5", "333", A, best=850)
    # B: a single PR; the later fto result must not extend the streak.
    insert_result(db, "b1", "Comp1", "333", B, best=1200)
    insert_result(db, "b2", "Comp2", "fto", B, best=100)

    response = client.post("/update-streak-ranks", headers=AUTH_HEADERS)
    assert response.status_code == 200, response.get_json()

    rows = fetch_all(db, "SELECT * FROM streak_ranks")
    assert _by_scope(rows, "rank", "current_streak", "longest_streak") == {
        # Ties on both streaks fall back to person id.
        "official": {A: (1, 1, 1), B: (2, 1, 1)},
        "all": {A: (1, 3, 3), B: (2, 1, 1)},
    }


def _load_nemesis_fixture(db):
    fixture = json.loads(PARITY_FIXTURE.read_text())
    for event in fixture["events"]:
        insert_event(db, event["id"], event["rank"])
    for wca_id in fixture["persons"]:
        insert_person(db, wca_id)
    for row in fixture["ranks"]:
        insert_rank(db, row["type"], row["personId"], row["eventId"], row["best"])
    return fixture["expected"]


@pytest.mark.parametrize("scope", ["official", "all"])
def test_nemesis_stats_parity(db, scope):
    expected = _load_nemesis_fixture(db)

    with db.cursor(cursor_factory=psycopg2.extensions.cursor) as cur:
        _compute_nemesis_stats(cur, scope)

    rows = fetch_all(
        db,
        "SELECT person_id, nemesis_count, nemesized_count, slot_count FROM nemesis_stats WHERE scope = %s",
        (scope,),
    )
    actual = {
        row["person_id"]: {
            "nemesisCount": row["nemesis_count"],
            "nemesizedCount": row["nemesized_count"],
            "slotCount": row["slot_count"],
        }
        for row in rows
    }
    assert actual == expected[scope]
