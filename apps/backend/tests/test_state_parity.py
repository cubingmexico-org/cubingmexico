"""Shared fixtures with apps/web/lib/parity.test.ts.

The web tags Cubing Contests UNR/USR with `markStateRecords`, which must follow the same rules as
official SR here.
"""

import json
from collections import namedtuple
from pathlib import Path

import pytest

from routes.admin.state import _mark_state_records

FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "parity"

RecordRow = namedtuple("RecordRow", ["id", "value", "record_date", "regional_record"])


def _load_cases(name):
    with open(FIXTURES_DIR / name, encoding="utf-8") as f:
        return json.load(f)["cases"]


@pytest.mark.parametrize("case", _load_cases("state-records.json"), ids=lambda c: c["name"])
def test_state_records_parity(case):
    rows = [RecordRow(r["id"], r["value"], r["recordDate"], r["regionalRecord"]) for r in case["rows"]]
    out = []
    _mark_state_records(rows, out)
    assert out == case["expected"]
