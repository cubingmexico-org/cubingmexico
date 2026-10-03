from collections import namedtuple
from contextlib import contextmanager

import pytest

Person = namedtuple("Person", "wca_id name state_id")
CompRow = namedtuple("CompRow", "person_id competition_id")
ChampRow = namedtuple("ChampRow", "person_id championship_id")
RankRow = namedtuple("RankRow", "person_id event_id best world_rank continent_rank country_rank state_rank")


class FakeCursor:
    def __init__(self, responses):
        self.responses = responses
        self.executed = []
        self._rows = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))
        for needle, rows in self.responses:
            if needle in sql:
                self._rows = rows
                return
        raise AssertionError(f"Unexpected SQL: {sql}")

    def fetchone(self):
        return self._rows[0]

    def fetchall(self):
        return self._rows


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor

    def cursor(self, **_kwargs):
        return self._cursor


@pytest.fixture
def fake_db(monkeypatch):
    def _install(responses):
        cursor = FakeCursor(responses)

        @contextmanager
        def fake_get_connection():
            yield FakeConnection(cursor)

        monkeypatch.setattr("routes.persons.get_connection", fake_get_connection)
        return cursor

    return _install


def test_persons_queries_are_page_scoped(client, fake_db):
    cursor = fake_db(
        [
            ("COUNT(*)", [(2,)]),
            ("FROM persons", [Person("2015AAAA01", "Ana", "PUE"), Person("2016BBBB01", "Beto", None)]),
            ("JOIN championships", [ChampRow("2015AAAA01", "mx-2025")]),
            ("FROM results", [CompRow("2015AAAA01", "CompA"), CompRow("2015AAAA01", "CompB")]),
            ("FROM ranks_single", [RankRow("2015AAAA01", "333", 600, 1000, 100, 1, 1)]),
            ("FROM ranks_average", [RankRow("2016BBBB01", "222", 300, 900, 90, 2, 2)]),
        ]
    )

    resp = client.get("/persons?page=1&size=2")
    assert resp.status_code == 200
    body = resp.get_json()

    follow_up = cursor.executed[2:]
    assert len(follow_up) == 4
    for sql, params in follow_up:
        assert "ANY(%s)" in sql
        assert params == (["2015AAAA01", "2016BBBB01"],)

    assert body["total"] == 2
    ana, beto = body["items"]
    assert ana["numberOfCompetitions"] == 2
    assert sorted(ana["competitionIds"]) == ["CompA", "CompB"]
    assert ana["championshipIds"] == ["mx-2025"]
    assert ana["rank"]["singles"] == [
        {"eventId": "333", "best": 600, "rank": {"world": 1000, "continent": 100, "country": 1, "state": 1}}
    ]
    assert ana["rank"]["averages"] == []
    assert beto["numberOfCompetitions"] == 0
    assert beto["rank"]["averages"][0]["eventId"] == "222"


def test_persons_empty_page_skips_follow_up_queries(client, fake_db):
    cursor = fake_db([("COUNT(*)", [(0,)]), ("FROM persons", [])])

    resp = client.get("/persons?page=99&stateId=PUE")
    assert resp.status_code == 200
    assert resp.get_json()["items"] == []
    assert len(cursor.executed) == 2
    assert cursor.executed[0][1] == ("PUE",)
