from datetime import date

import pytest

import common
from social.digest_queries_streaks import fetch_streaks_monthly_payload
from social.digest_queries_weekly import fetch_weekly_digest_payload
from social.digest_queries_year import fetch_year_recap_payload

from .factories import (
    insert_competition,
    insert_event,
    insert_person,
    insert_result,
    insert_round_type,
    insert_state,
    insert_streak_rank,
)

# Publish week 2024-W12: primary comps end in W10 (Mar 4-10), upcoming start in [Mar 18, Apr 1).
WEEK_KEY = "2024-W12"


@pytest.fixture
def digest_data(db):
    insert_state(db, "JAL", "Jalisco")
    insert_state(db, "CMX", "Ciudad de México")
    insert_event(db, "333", 10)
    insert_event(db, "333ft", 996)
    insert_event(db, "fto", 810)
    insert_round_type(db, "f", 90)
    insert_person(db, "2024ANAA01", name="Ana", state_id="JAL")
    insert_person(db, "2023BETO01", name="Beto", state_id="CMX")

    insert_competition(db, "Old2023", date(2023, 5, 1))
    insert_competition(db, "Primary2024", date(2024, 3, 9), state_id="JAL")
    insert_competition(db, "Upcoming2024", date(2024, 3, 23), state_id="CMX")

    insert_result(db, "old", "Old2023", "333", "2023BETO01", best=700, round_type_id="f", pos=1)
    insert_result(db, "b333", "Primary2024", "333", "2023BETO01", best=600, pos=2, round_type_id="f")
    # The same NR + SR single in an official, a deprecated and an announced event.
    for result_id, event_id, person_id in [
        ("a333", "333", "2024ANAA01"),
        ("aft", "333ft", "2024ANAA01"),
        ("bfto", "fto", "2023BETO01"),
    ]:
        insert_result(
            db,
            result_id,
            "Primary2024",
            event_id,
            person_id,
            best=500,
            pos=1,
            round_type_id="f",
            regional_single_record="NR",
            state_single_record="SR",
        )
    return db


def _payload(fetch, *args) -> dict:
    with common.cursor() as cur:
        payload = fetch(cur, *args)
    assert payload is not None
    return payload


def test_weekly_digest_counts_only_official_events(digest_data):
    payload = _payload(fetch_weekly_digest_payload, WEEK_KEY)

    assert [c["id"] for c in payload["primary_comps"]] == ["Primary2024"]
    assert [c["id"] for c in payload["upcoming_comps"]] == ["Upcoming2024"]
    assert payload["late_comps"] == []
    assert payload["record_counts"] == {"wr": 0, "nar": 0, "nr": 1}
    assert payload["record_highlights"] == [
        {
            "person_name": "Ana",
            "event_name": "333",
            "level": "NR",
            "kind": "single",
            "competition_name": "Primary2024",
        }
    ]
    assert payload["sr_total"] == 1
    assert payload["sr_by_state"] == [{"state_name": "Jalisco", "count": 1}]
    assert payload["sr_breakers"] == [{"person_name": "Ana", "state_name": "Jalisco", "count": 1}]
    assert payload["podium_count"] == 2
    assert [d["person_id"] for d in payload["debuts"]] == ["2024ANAA01"]
    assert payload["is_empty"] is False


def test_weekly_digest_rejects_invalid_week_keys(digest_data):
    with common.cursor() as cur:
        assert fetch_weekly_digest_payload(cur, "2024-12") is None


def test_year_recap_counts_only_official_events(digest_data):
    payload = _payload(fetch_year_recap_payload, 2024)

    assert payload["comp_count"] == 2
    assert payload["state_count"] == 2
    assert payload["competitor_count"] == 2
    assert payload["debut_count"] == 1
    assert payload["record_counts"] == {"wr": 0, "nar": 0, "nr": 1}
    assert [h["event_name"] for h in payload["record_highlights"]] == ["333"]
    assert payload["sr_total"] == 1
    assert payload["sr_breakers"] == [{"person_name": "Ana", "state_name": "Jalisco", "count": 1}]
    assert payload["podium_count"] == 2
    assert payload["busiest_competitor"] == {"person_name": "Ana", "state_name": "Jalisco", "count": 1}


def test_streaks_monthly_reads_the_official_scope(digest_data):
    insert_streak_rank(digest_data, "2024ANAA01", "official", current=3, longest=3)
    insert_streak_rank(digest_data, "2023BETO01", "official", current=1, longest=5)
    insert_streak_rank(digest_data, "2023BETO01", "all", current=9, longest=9)

    payload = _payload(fetch_streaks_monthly_payload, "2024-03")

    assert [(p["person_id"], p["current_streak"]) for p in payload["top_current"]] == [
        ("2024ANAA01", 3),
        ("2023BETO01", 1),
    ]
    assert payload["longest_callout"]["person_id"] == "2023BETO01"
    assert payload["longest_callout"]["longest_streak"] == 5
