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


# Single-state routes, called by the web app when a team edits its roster.


def _seed_states(db):
    insert_state(db, "JAL", "Jalisco")
    insert_state(db, "CMX", "Ciudad de México")
    insert_state(db, "ZAC", "Zacatecas")


def test_one_state_ranks_follow_country_rank_and_leave_other_states_alone(client, db):
    _seed_states(db)
    insert_event(db, "333", 10)
    insert_person(db, "2020AAAA01", state_id="JAL")
    insert_person(db, "2020BBBB01", state_id="JAL")
    insert_person(db, "2020CCCC01", state_id="CMX")
    insert_person(db, "2020DDDD01", state_id="JAL")
    insert_rank(db, "single", "2020CCCC01", "333", 500, country_rank=1, state_rank=9)
    insert_rank(db, "single", "2020BBBB01", "333", 600, country_rank=2)
    insert_rank(db, "single", "2020DDDD01", "333", 700, country_rank=3)
    insert_rank(db, "single", "2020AAAA01", "333", 800, country_rank=4)

    response = client.post("/update-state-ranks/JAL", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    assert _state_ranks(db, "ranks_single") == {
        ("2020BBBB01", "333"): 1,
        ("2020DDDD01", "333"): 2,
        ("2020AAAA01", "333"): 3,
        # Other states keep whatever they had.
        ("2020CCCC01", "333"): 9,
    }


def test_one_state_ranks_skip_country_rank_zero_and_fto_but_rank_deprecated_events(client, db):
    _seed_states(db)
    insert_event(db, "333", 10)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    insert_person(db, "2020AAAA01", state_id="JAL")
    insert_person(db, "2020BBBB01", state_id="JAL")
    insert_rank(db, "single", "2020AAAA01", "333", 500, country_rank=0, state_rank=7)
    insert_rank(db, "single", "2020BBBB01", "333", 600, country_rank=5)
    insert_rank(db, "single", "2020AAAA01", "333ft", 900, country_rank=1)
    insert_rank(db, "single", "2020AAAA01", "fto", 3000, country_rank=1)
    insert_rank(db, "average", "2020BBBB01", "333", 650, country_rank=1)
    insert_rank(db, "average", "2020AAAA01", "333", 700, country_rank=2)

    assert client.post("/update-state-ranks/JAL", headers=AUTH_HEADERS).status_code == 200

    assert _state_ranks(db, "ranks_single") == {
        ("2020AAAA01", "333"): None,
        ("2020BBBB01", "333"): 1,
        ("2020AAAA01", "333ft"): 1,
        ("2020AAAA01", "fto"): None,
    }
    assert _state_ranks(db, "ranks_average") == {
        ("2020BBBB01", "333"): 1,
        ("2020AAAA01", "333"): 2,
    }


def _seed_record_people(db):
    _seed_states(db)
    insert_event(db, "333", 10)
    insert_round_type(db, "1", 10)
    insert_round_type(db, "f", 90)
    insert_person(db, "2020AAAA01", state_id="JAL")
    insert_person(db, "2020BBBB01", state_id="JAL")
    insert_person(db, "2020CCCC01", state_id="CMX")


def _tagged_singles(db):
    rows = fetch_all(db, "SELECT id FROM results WHERE state_single_record = 'SR' ORDER BY id")
    return [row["id"] for row in rows]


def test_one_state_records_tag_improvements_and_return_members(client, db):
    _seed_record_people(db)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    insert_competition(db, "CompA2024", date(2024, 1, 1))
    insert_competition(db, "CompB2024", date(2024, 2, 1))
    insert_competition(db, "CompC2024", date(2024, 3, 1))
    insert_result(db, "a", "CompA2024", "333", "2020AAAA01", best=1000, average=1100)
    insert_result(db, "b", "CompB2024", "333", "2020BBBB01", best=1200, average=1000)
    insert_result(db, "c", "CompC2024", "333", "2020BBBB01", best=900)
    insert_result(db, "x", "CompC2024", "333", "2020CCCC01", best=500)
    insert_result(db, "ft", "CompA2024", "333ft", "2020AAAA01", best=5000)
    insert_result(db, "octa", "CompA2024", "fto", "2020AAAA01", best=3000)
    insert_result(db, "dnf", "CompA2024", "333", "2020BBBB01", best=-1)

    response = client.post("/update-state-records/JAL", headers=AUTH_HEADERS)

    assert response.status_code == 200, response.get_json()
    body = response.get_json()
    assert sorted(body["personIds"]) == ["2020AAAA01", "2020BBBB01"]
    assert body["singleCount"] == 3
    assert body["averageCount"] == 2
    assert _tagged_singles(db) == ["a", "c", "ft"]


def test_one_state_records_tag_only_the_best_improvement_of_a_day(client, db):
    _seed_record_people(db)
    insert_competition(db, "CompA2024", date(2024, 1, 1))
    insert_result(db, "r1", "CompA2024", "333", "2020AAAA01", round_type_id="1", best=1000)
    insert_result(db, "rf", "CompA2024", "333", "2020AAAA01", round_type_id="f", best=950)

    assert client.post("/update-state-records/JAL", headers=AUTH_HEADERS).status_code == 200

    assert _tagged_singles(db) == ["rf"]


def test_one_state_records_use_round_end_dates(client, db):
    _seed_record_people(db)
    insert_competition(db, "CompA2024", date(2024, 1, 1))
    for round_type_id, end_date in (("1", date(2024, 1, 1)), ("f", date(2024, 1, 2))):
        with db.cursor() as cur:
            cur.execute(
                """
                INSERT INTO competition_round_dates (competition_id, event_id, round_type_id, end_date, source)
                VALUES ('CompA2024', '333', %s, %s, 'manual')
                """,
                (round_type_id, end_date),
            )
    insert_result(db, "r1", "CompA2024", "333", "2020AAAA01", round_type_id="1", best=1000)
    insert_result(db, "rf", "CompA2024", "333", "2020AAAA01", round_type_id="f", best=950)

    assert client.post("/update-state-records/JAL", headers=AUTH_HEADERS).status_code == 200

    assert _tagged_singles(db) == ["r1", "rf"]


def test_one_state_records_skip_regional_records_but_advance_the_best(client, db):
    _seed_record_people(db)
    insert_competition(db, "CompA2024", date(2024, 1, 1))
    insert_competition(db, "CompB2024", date(2024, 2, 1))
    insert_competition(db, "CompC2024", date(2024, 3, 1))
    insert_result(db, "nr", "CompA2024", "333", "2020AAAA01", best=1000, regional_single_record="NR")
    insert_result(db, "slower", "CompB2024", "333", "2020BBBB01", best=1050)
    insert_result(db, "faster", "CompC2024", "333", "2020BBBB01", best=990)

    assert client.post("/update-state-records/JAL", headers=AUTH_HEADERS).status_code == 200

    assert _tagged_singles(db) == ["faster"]


def test_one_state_records_clear_stale_markers_only_for_members(client, db):
    _seed_record_people(db)
    insert_competition(db, "CompA2024", date(2024, 1, 1))
    insert_competition(db, "CompB2024", date(2024, 2, 1))
    insert_result(db, "first", "CompA2024", "333", "2020AAAA01", best=900)
    insert_result(db, "stale", "CompB2024", "333", "2020AAAA01", best=1000, state_single_record="SR")
    insert_result(db, "other", "CompB2024", "333", "2020CCCC01", best=2000, state_single_record="SR")

    assert client.post("/update-state-records/JAL", headers=AUTH_HEADERS).status_code == 200

    assert _tagged_singles(db) == ["first", "other"]


def test_one_state_records_for_a_state_without_members(client, db):
    _seed_record_people(db)

    response = client.post("/update-state-records/ZAC", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert response.get_json() == {
        "success": True,
        "message": "State records updated successfully",
        "personIds": [],
        "singleCount": 0,
        "averageCount": 0,
    }


def test_single_state_routes_reject_unknown_states(client, db):
    _seed_states(db)

    for path in ("/update-state-ranks/XXX", "/update-state-records/XXX"):
        response = client.post(path, headers=AUTH_HEADERS)
        assert response.status_code == 404
        assert response.get_json()["message"] == "Invalid stateId"


def test_single_state_routes_require_cron_auth(client):
    assert client.post("/update-state-ranks/JAL").status_code == 401
    assert client.post("/update-state-records/JAL").status_code == 401
