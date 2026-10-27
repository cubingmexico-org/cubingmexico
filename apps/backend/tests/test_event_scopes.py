import re
from collections import namedtuple
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from common import (
    EVENT_SCOPES,
    OFFICIAL_EVENTS_SUBQUERY,
    WITH_DEPRECATED_EVENTS_SUBQUERY,
    events_subquery,
)
from routes.admin.rankings import _compute_streak_ranks, _kinch_query, _sum_of_ranks_query

ResultRow = namedtuple("ResultRow", "person_id competition_id event_id best average")

BACKEND_ROOT = Path(__file__).resolve().parents[1]
EVENTS_JOIN = re.compile(r"\bjoin\s+events\b", re.IGNORECASE)
SCOPE_HELPER = re.compile(r"\b(events_subquery|OFFICIAL_EVENTS_SUBQUERY|WITH_DEPRECATED_EVENTS_SUBQUERY)\b")
# Files that join `events` only to label or order rows, never to count, rank or compare them.
DISPLAY_ONLY = {
    "routes/competitions.py": "one competition's event list",
}


def _unscoped_events_joins():
    files = [
        *BACKEND_ROOT.glob("*.py"),
        *BACKEND_ROOT.glob("routes/**/*.py"),
        *BACKEND_ROOT.glob("social/**/*.py"),
    ]
    return sorted(
        path.relative_to(BACKEND_ROOT).as_posix()
        for path in files
        if EVENTS_JOIN.search(source := path.read_text()) and not SCOPE_HELPER.search(source)
    )


def test_every_events_join_is_scoped_or_display_only():
    # .cursor/rules/official-events.mdc: queries that count, rank or compare events must apply a scope.
    unscoped = _unscoped_events_joins()
    assert [path for path in unscoped if path not in DISPLAY_ONLY] == []
    assert [path for path in DISPLAY_ONLY if path not in unscoped] == [], "stale DISPLAY_ONLY entry"


def test_events_subquery_per_scope():
    assert events_subquery("official") == OFFICIAL_EVENTS_SUBQUERY
    assert events_subquery("all") == WITH_DEPRECATED_EVENTS_SUBQUERY
    assert "rank < 800" in OFFICIAL_EVENTS_SUBQUERY
    assert "BETWEEN 990 AND 999" in WITH_DEPRECATED_EVENTS_SUBQUERY


@pytest.mark.parametrize("scope", EVENT_SCOPES)
def test_derived_queries_use_scope_events(scope):
    assert events_subquery(scope) in _sum_of_ranks_query("ranks_single", scope)
    kinch = _kinch_query(scope)
    assert events_subquery(scope) in kinch
    assert "'333mbo'" in kinch


@pytest.mark.parametrize("scope", EVENT_SCOPES)
def test_streak_ranks_only_replace_their_scope(scope):
    cur = MagicMock()
    cur.fetchall.return_value = [ResultRow("2020AAAA01", "CompA", "333", 500, 0)]

    with patch("routes.admin.rankings.execute_values") as execute_values:
        _compute_streak_ranks(cur, scope)

    assert events_subquery(scope) in cur.execute.call_args_list[0].args[0]
    assert cur.execute.call_args_list[1].args == ("DELETE FROM streak_ranks WHERE scope = %s", (scope,))
    assert execute_values.call_args.args[2] == [(1, "2020AAAA01", scope, 1, 1)]
