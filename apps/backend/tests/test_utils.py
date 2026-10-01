from collections import namedtuple
from datetime import date

import pytest

from routes.admin.rankings import _compute_person_streaks, _is_personal_record
from routes.admin.state import _mark_state_records
from utils import parse_int_query_param_or_default


@pytest.mark.parametrize(
    ("query", "expected"),
    [("", 1), ("?page=3", 3), ("?page=abc", 1), ("?page=0", 1), ("?page=-5", 1), ("?page=500", 100)],
)
def test_parse_int_query_param_or_default(app, query, expected):
    with app.test_request_context(f"/persons{query}"):
        assert parse_int_query_param_or_default("page", 1, min_value=1, max_value=100) == expected


@pytest.mark.parametrize(
    ("result", "records", "expected"),
    [
        (0, {}, False),
        (-1, {}, False),
        (500, {}, True),
        (500, {"333": 600}, True),
        (500, {"333": 500}, True),
        (700, {"333": 600}, False),
    ],
)
def test_is_personal_record(result, records, expected):
    assert _is_personal_record("333", result, records) is expected


def test_compute_person_streaks_counts_consecutive_pr_competitions():
    rows = [
        ("CompA", "333", 1000, 1200),
        ("CompB", "333", 900, 1300),
        ("CompC", "333", 950, 1250),
        ("CompD", "333", 1100, 1400),
        ("CompE", "222", 300, 400),
    ]
    # A: first results -> PR. B: single PR. C: no PR. D: no PR. E: new event -> PR.
    assert _compute_person_streaks(rows) == (1, 2)


def test_compute_person_streaks_ignores_dnf_and_empty():
    assert _compute_person_streaks([]) == (0, 0)
    assert _compute_person_streaks([("CompA", "333", -1, 0)]) == (0, 0)


Row = namedtuple("Row", "id value record_date regional_record")


def test_mark_state_records_tags_improvements_and_skips_regional():
    rows = [
        Row(1, 1000, date(2026, 1, 1), None),
        Row(2, 1100, date(2026, 2, 1), None),
        Row(3, 900, date(2026, 3, 1), "NR"),
        Row(4, 850, date(2026, 4, 1), None),
        Row(5, 0, date(2026, 5, 1), None),
    ]
    out = []
    _mark_state_records(rows, out)
    assert out == [1, 4]


def test_mark_state_records_only_best_of_same_day():
    rows = [
        Row(1, 1000, date(2026, 1, 1), None),
        Row(2, 950, date(2026, 1, 1), None),
        Row(3, 980, date(2026, 1, 1), None),
    ]
    out = []
    _mark_state_records(rows, out)
    assert out == [2]
