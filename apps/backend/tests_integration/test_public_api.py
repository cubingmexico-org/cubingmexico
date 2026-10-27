import pytest

import routes.misc

from .factories import insert_event, insert_person, insert_rank, insert_state, insert_team


@pytest.fixture
def ranks(db):
    insert_state(db, "CMX", "Ciudad de México")
    insert_state(db, "JAL", "Jalisco")
    insert_event(db, "333", 10)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    people = [
        ("2015AAAA01", "CMX", 1, 2),
        ("2015BBBB01", "JAL", 2, 1),
        ("2015CCCC01", "CMX", 3, 1),
        ("2015DDDD01", "CMX", 4, None),
    ]
    for wca_id, state_id, country_rank, state_rank in people:
        insert_person(db, wca_id, state_id=state_id)
        insert_rank(db, "single", wca_id, "333", 800 + country_rank, country_rank=country_rank, state_rank=state_rank)
    insert_rank(db, "single", "2015AAAA01", "333ft", 3000, country_rank=1, state_rank=1)
    return db


def _person_ids(response):
    return [row["personId"] for row in response.get_json()]


def test_national_ranks_are_ordered_and_paginated(client, ranks):
    response = client.get("/rank/single/333?page=2&size=2")

    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "4"
    assert _person_ids(response) == ["2015CCCC01", "2015DDDD01"]
    assert response.get_json()[0]["stateId"] == "CMX"


def test_size_is_capped(client, ranks):
    response = client.get("/rank/single/333?size=5000")

    assert response.status_code == 200
    assert len(response.get_json()) == 4


def test_ranks_are_unpaginated_without_page_or_size(client, ranks, monkeypatch):
    monkeypatch.setattr(routes.misc, "MAX_RANK_PAGE_SIZE", 2)

    response = client.get("/rank/single/333")

    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "4"
    assert _person_ids(response) == ["2015AAAA01", "2015BBBB01", "2015CCCC01", "2015DDDD01"]


@pytest.mark.parametrize("query", ["page=1", "size=2"])
def test_page_or_size_turns_on_pagination(client, ranks, monkeypatch, query):
    monkeypatch.setattr(routes.misc, "MAX_RANK_PAGE_SIZE", 2)

    response = client.get(f"/rank/single/333?{query}")

    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "4"
    assert _person_ids(response) == ["2015AAAA01", "2015BBBB01"]


def test_state_ranks_are_ordered_by_state_rank(client, ranks):
    response = client.get("/rank/CMX/single/333")

    assert response.status_code == 200
    assert response.headers["X-Total-Count"] == "3"
    assert _person_ids(response) == ["2015CCCC01", "2015AAAA01", "2015DDDD01"]


@pytest.mark.parametrize("path", ["/rank/best/333", "/rank/CMX/best/333"])
def test_invalid_rank_type_is_a_bad_request(client, ranks, path):
    assert client.get(path).status_code == 400


def test_invalid_deprecated_flag_is_a_bad_request(client, ranks):
    assert client.get("/rank/single/333?deprecated=maybe").status_code == 400


def test_unknown_state_is_not_found(client, ranks):
    response = client.get("/rank/XXX/single/333")

    assert response.status_code == 404
    assert response.get_json()["message"] == "State not found"


@pytest.mark.parametrize("path", ["/rank/single/333ft", "/rank/CMX/single/333ft"])
def test_deprecated_events_need_the_deprecated_flag(client, ranks, path):
    assert client.get(path).status_code == 404

    response = client.get(f"{path}?deprecated=true")
    assert response.status_code == 200
    assert _person_ids(response) == ["2015AAAA01"]


def test_unofficial_events_are_never_ranked(client, ranks):
    assert client.get("/rank/single/fto?deprecated=true").status_code == 404


def test_event_without_ranks_is_not_found(client, ranks):
    response = client.get("/rank/average/333")

    assert response.status_code == 404
    assert response.get_json()["message"] == "Ranks not found"


def test_successful_reads_are_cacheable(client, ranks):
    for path in ["/rank/single/333", "/states", "/teams"]:
        response = client.get(path)
        assert response.status_code == 200
        assert response.headers["Cache-Control"] == "public, max-age=3600"


def test_errors_are_not_cached(client, ranks):
    response = client.get("/rank/XXX/single/333")

    assert "Cache-Control" not in response.headers


TEAM_KEYS = {"name", "description", "image", "coverImage", "stateId", "founded", "socialLinks", "isActive"}


def test_teams_expose_only_the_public_columns(client, db):
    insert_state(db, "JAL", "Jalisco")
    insert_team(db, "JAL", "Jalisco Cubing", description="Equipo")

    teams = client.get("/teams").get_json()
    assert [set(team) for team in teams] == [TEAM_KEYS]

    response = client.get("/teams/JAL")
    assert response.status_code == 200
    assert set(response.get_json()) == TEAM_KEYS
    assert response.get_json()["description"] == "Equipo"

    assert client.get("/teams/CMX").status_code == 404


def test_states_expose_id_and_name(client, db):
    insert_state(db, "JAL", "Jalisco")

    assert client.get("/states").get_json() == [{"id": "JAL", "name": "Jalisco"}]


def test_state_records_list_official_events_only(client, ranks):
    response = client.get("/records/CMX")

    assert response.status_code == 200
    records = response.get_json()
    assert [(r["personId"], r["eventId"]) for r in records["single"]] == [("2015CCCC01", "333")]
    assert records["average"] == []


def test_unexpected_errors_return_a_generic_500(client, monkeypatch):
    def broken_cursor():
        raise RuntimeError("secret detail")

    monkeypatch.setattr(routes.misc, "cursor", broken_cursor)

    response = client.get("/states")
    assert response.status_code == 500
    assert response.get_json() == {"success": False, "message": "Internal server error"}
