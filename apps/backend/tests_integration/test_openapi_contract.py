"""Every public route's real responses match packages/public-api/openapi.json."""

from datetime import date

import pytest

import routes.competitions

from .factories import (
    insert_competition,
    insert_event,
    insert_person,
    insert_rank,
    insert_result,
    insert_round_type,
    insert_state,
    insert_team,
)
from .openapi import SPEC, assert_matches_spec

COMPETITION = "MexicoOpen2024"
PERSON = "2015AAAA01"

# (OpenAPI path, request URL, expected status)
CASES = [
    ("/competitions", "/competitions?page=1&size=10", 200),
    ("/competitions", "/competitions?year=nope", 400),
    ("/competitions/{competition_id}", f"/competitions/{COMPETITION}", 200),
    ("/competitions/{competition_id}", "/competitions/Missing2024", 200),
    ("/competitor-states/{competition_id}", f"/competitor-states/{COMPETITION}", 200),
    ("/persons", "/persons?stateId=CMX", 200),
    ("/persons/{wca_id}", f"/persons/{PERSON}", 200),
    ("/persons/{wca_id}", "/persons/2099ZZZZ99", 404),
    ("/teams", "/teams", 200),
    ("/teams/{state_id}", "/teams/CMX", 200),
    ("/teams/{state_id}", "/teams/JAL", 404),
    ("/states", "/states", 200),
    ("/rank/{type}/{event_id}", "/rank/single/333", 200),
    ("/rank/{type}/{event_id}", "/rank/best/333", 400),
    ("/rank/{type}/{event_id}", "/rank/average/333", 404),
    ("/rank/{state_id}/{type}/{event_id}", "/rank/CMX/single/333", 200),
    ("/rank/{state_id}/{type}/{event_id}", "/rank/XXX/single/333", 404),
    ("/records/{state_id}", "/records/CMX", 200),
]


class _FakeWcifResponse:
    def raise_for_status(self):
        pass

    def json(self):
        return {"persons": [{"wcaId": PERSON}, {"wcaId": None}]}


@pytest.fixture
def seeded(db, monkeypatch):
    insert_state(db, "CMX", "Ciudad de México")
    insert_state(db, "JAL", "Jalisco")
    insert_team(db, "CMX", "Team CDMX", social_links='{"instagram": "https://instagram.com/x"}')
    insert_event(db, "333", 10)
    insert_round_type(db, "f", 10)
    insert_person(db, PERSON, state_id="CMX")
    insert_rank(db, "single", PERSON, "333", 800, state_rank=1)
    insert_competition(db, COMPETITION, date(2024, 6, 1), state_id="CMX", logo="https://example.com/logo.png")
    insert_result(db, "1", COMPETITION, "333", PERSON, best=800, round_type_id="f")
    with db.cursor() as cur:
        cur.execute("INSERT INTO competition_events (competition_id, event_id) VALUES (%s, '333')", (COMPETITION,))
        cur.execute(
            "INSERT INTO championships (id, competition_id, championship_type) VALUES ('mx', %s, 'MX')", (COMPETITION,)
        )
        cur.execute("INSERT INTO organizers (id, person_id, status) VALUES ('o1', %s, 'active')", (PERSON,))
        cur.execute(
            "INSERT INTO competition_organizers (competition_id, organizer_id) VALUES (%s, 'o1')", (COMPETITION,)
        )
        cur.execute("INSERT INTO delegates (id, person_id, status) VALUES ('d1', %s, 'delegate')", (PERSON,))
        cur.execute("INSERT INTO competition_delegates (competition_id, delegate_id) VALUES (%s, 'd1')", (COMPETITION,))
    monkeypatch.setattr(routes.competitions.requests, "get", lambda *_args, **_kwargs: _FakeWcifResponse())
    return db


def test_every_documented_path_is_exercised():
    assert {path for path, _, _ in CASES} == set(SPEC["paths"])


@pytest.mark.parametrize(("path", "url", "status"), CASES, ids=[url for _, url, _ in CASES])
def test_response_matches_spec(client, seeded, path, url, status):
    response = client.get(url)

    assert response.status_code == status
    assert_matches_spec(path, response)


def test_populated_responses_are_not_empty(client, seeded):
    # Guards against a vacuous pass where every list in the contract test is empty.
    competition = client.get(f"/competitions/{COMPETITION}").get_json()
    assert competition["events"] and competition["organizers"] and competition["delegates"]
    assert competition["championships"]
    assert competition["startDate"] == "Sat, 01 Jun 2024 00:00:00 GMT"
    assert client.get(f"/persons/{PERSON}").get_json()["rank"]["singles"]
    assert client.get("/records/CMX").get_json()["single"]
    assert client.get(f"/competitor-states/{COMPETITION}").get_json() == [{"wcaId": PERSON, "stateId": "CMX"}]
