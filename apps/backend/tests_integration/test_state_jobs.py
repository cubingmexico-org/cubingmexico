from datetime import date

from tests_integration.factories import (
    AUTH_HEADERS,
    fetch_all,
    insert_competition,
    insert_event,
    insert_person,
    insert_rank,
    insert_result,
    insert_round_type,
    insert_state,
)


def _state_ranks(db, table):
    rows = fetch_all(db, f"SELECT person_id, event_id, state_rank FROM {table}")
    return {(row["person_id"], row["event_id"]): row["state_rank"] for row in rows}


def test_update_state_ranks(client, db):
    insert_state(db, "PUE", "Puebla")
    insert_state(db, "TLA", "Tlaxcala")
    insert_event(db, "333", 10)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    insert_person(db, "2020PUEB01", state_id="PUE")
    insert_person(db, "2020PUEB02", state_id="PUE")
    insert_person(db, "2020PUEB03", state_id="PUE")
    insert_person(db, "2020TLAX01", state_id="TLA")
    insert_person(db, "2020NONE01")

    insert_rank(db, "single", "2020PUEB01", "333", 900, country_rank=5)
    insert_rank(db, "single", "2020PUEB02", "333", 800, country_rank=2)
    insert_rank(db, "single", "2020PUEB03", "333", 950, country_rank=0, state_rank=7)
    insert_rank(db, "single", "2020TLAX01", "333", 700, country_rank=1)
    insert_rank(db, "single", "2020NONE01", "333", 850, country_rank=3)
    insert_rank(db, "single", "2020PUEB01", "333ft", 3000, country_rank=1)
    insert_rank(db, "single", "2020PUEB02", "fto", 4000, country_rank=1, state_rank=4)
    insert_rank(db, "average", "2020PUEB01", "333", 1000, country_rank=1)
    insert_rank(db, "average", "2020PUEB02", "333", 1100, country_rank=2)

    response = client.post("/update-state-ranks", headers=AUTH_HEADERS)
    assert response.status_code == 200, response.get_json()

    assert _state_ranks(db, "ranks_single") == {
        ("2020PUEB02", "333"): 1,
        ("2020PUEB01", "333"): 2,
        # No country rank means no state rank, and the stale value is cleared.
        ("2020PUEB03", "333"): None,
        ("2020TLAX01", "333"): 1,
        ("2020NONE01", "333"): None,
        # State ranks are stored for the `all` scope, so deprecated events get one.
        ("2020PUEB01", "333ft"): 1,
        # Announced-but-unofficial events never do.
        ("2020PUEB02", "fto"): None,
    }
    assert _state_ranks(db, "ranks_average") == {
        ("2020PUEB01", "333"): 1,
        ("2020PUEB02", "333"): 2,
    }


def test_update_state_records(client, db):
    insert_state(db, "PUE", "Puebla")
    insert_state(db, "TLA", "Tlaxcala")
    insert_event(db, "333", 10)
    insert_event(db, "fto", 810)
    insert_round_type(db, "1", 10)
    insert_round_type(db, "f", 100)
    insert_person(db, "2020PUEB01", state_id="PUE")
    insert_person(db, "2020PUEB02", state_id="PUE")
    insert_person(db, "2020TLAX01", state_id="TLA")
    insert_competition(db, "Comp1", date(2024, 1, 10))
    insert_competition(db, "Comp2", date(2024, 2, 10))
    insert_competition(db, "Comp3", date(2024, 3, 10))

    # First result in the state: SR for single and average.
    insert_result(db, "r1", "Comp1", "333", "2020PUEB01", best=1000, average=1100, round_type_id="1")
    # Same day but slower: only the day's best is an SR.
    insert_result(db, "r2", "Comp1", "333", "2020PUEB02", best=1200, round_type_id="f")
    # An NR is never also an SR, but it still raises the bar.
    insert_result(db, "r3", "Comp2", "333", "2020PUEB02", best=900, regional_single_record="NR")
    # Slower than the NR: not an SR, and a stale marker is cleared.
    insert_result(db, "r4", "Comp3", "333", "2020PUEB01", best=950, state_single_record="SR")
    insert_result(db, "r5", "Comp3", "333", "2020PUEB02", best=880)
    # Each state keeps its own records.
    insert_result(db, "r6", "Comp1", "333", "2020TLAX01", best=500)
    # Unofficial events never get SR markers.
    insert_result(db, "r7", "Comp1", "fto", "2020PUEB01", best=100)

    response = client.post("/update-state-records", headers=AUTH_HEADERS)
    assert response.status_code == 200, response.get_json()

    rows = fetch_all(db, "SELECT id, state_single_record, state_average_record FROM results ORDER BY id")
    assert {row["id"]: row["state_single_record"] for row in rows} == {
        "r1": "SR",
        "r2": None,
        "r3": None,
        "r4": None,
        "r5": "SR",
        "r6": "SR",
        "r7": None,
    }
    assert [row["id"] for row in rows if row["state_average_record"] == "SR"] == ["r1"]
