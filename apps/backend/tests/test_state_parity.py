"""Shared fixtures with apps/web/lib/parity.test.ts — both implementations must agree."""

import json
from collections import namedtuple
from pathlib import Path

import pytest

from routes.admin.state import _assign_sequential_ranks, _mark_state_records

FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "parity"

RankRow = namedtuple("RankRow", ["person_id", "event_id"])
RecordRow = namedtuple("RecordRow", ["id", "value", "record_date", "regional_record"])


def _load_cases(name):
    with open(FIXTURES_DIR / name, encoding="utf-8") as f:
        return json.load(f)["cases"]


@pytest.mark.parametrize("case", _load_cases("state-ranks.json"), ids=lambda c: c["name"])
def test_state_ranks_parity(case):
    rows = [RankRow(r["personId"], r["eventId"]) for r in case["input"]]
    expected = [
        {"person_id": e["personId"], "event_id": e["eventId"], "state_rank": e["stateRank"]} for e in case["expected"]
    ]
    assert _assign_sequential_ranks(rows) == expected


@pytest.mark.parametrize("case", _load_cases("state-records.json"), ids=lambda c: c["name"])
def test_state_records_parity(case):
    rows = [RecordRow(r["id"], r["value"], r["recordDate"], r["regionalRecord"]) for r in case["rows"]]
    out = []
    _mark_state_records(rows, out)
    assert out == case["expected"]
