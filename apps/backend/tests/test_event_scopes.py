from collections import namedtuple
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
