from unittest.mock import MagicMock

import psycopg
import pytest
from psycopg_pool import PoolTimeout

import common


class FakeConn:
    def __init__(self, rollback_error=None):
        self.closed = False
        self.commits = 0
        self.rollbacks = 0
        self.rollback_error = rollback_error

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1
        if self.rollback_error:
            raise self.rollback_error

    def close(self):
        self.closed = True


class FakePool:
    def __init__(self, exhausted=False, conn=None):
        self.exhausted = exhausted
        self.conn = conn
        self.out = []
        self.returned = []
        self.timeouts = []

    def getconn(self, timeout=None):
        self.timeouts.append(timeout)
        if self.exhausted:
            raise PoolTimeout("couldn't get a connection")
        conn = self.conn or FakeConn()
        self.out.append(conn)
        return conn

    def putconn(self, conn):
        self.returned.append(conn)


@pytest.fixture
def fake_pool(monkeypatch):
    def _install(**kwargs):
        pool = FakePool(**kwargs)
        monkeypatch.setattr(common, "_pool", pool)
        return pool

    return _install


def test_commits_and_returns_to_pool(fake_pool):
    pool = fake_pool()
    with common.get_connection():
        pass
    conn = pool.out[0]
    assert conn.commits == 1
    assert pool.returned == [conn]
    assert pool.timeouts == [common.DB_POOL_CHECKOUT_TIMEOUT]


def test_rolls_back_and_returns_on_error(fake_pool):
    pool = fake_pool()
    with pytest.raises(ValueError), common.get_connection():
        raise ValueError("boom")
    conn = pool.out[0]
    assert conn.commits == 0
    assert conn.rollbacks == 1
    assert pool.returned == [conn]


def test_closes_the_connection_when_rollback_fails(fake_pool):
    broken = FakeConn(rollback_error=psycopg.OperationalError("server closed the connection"))
    pool = fake_pool(conn=broken)
    with pytest.raises(ValueError), common.get_connection():
        raise ValueError("boom")
    assert broken.closed
    # The pool discards closed connections it gets back.
    assert pool.returned == [broken]


def test_falls_back_to_one_off_connection_when_exhausted(fake_pool, monkeypatch):
    fake_pool(exhausted=True)
    one_off = FakeConn()
    connect = MagicMock(return_value=one_off)
    monkeypatch.setattr(common.psycopg, "connect", connect)

    with common.get_connection() as conn:
        assert conn is one_off
    assert one_off.commits == 1
    assert one_off.closed
    connect.assert_called_once_with(common.DB_URL, prepare_threshold=None)


def test_execute_values_pages_rows_into_multi_row_statements():
    cur = MagicMock()
    rows = [(i, f"p{i}") for i in range(5)]

    common.execute_values(cur, "INSERT INTO t (a, b) VALUES %s ON CONFLICT DO NOTHING", rows, page_size=2)

    assert [call.args for call in cur.execute.call_args_list] == [
        ("INSERT INTO t (a, b) VALUES (%s, %s), (%s, %s) ON CONFLICT DO NOTHING", [0, "p0", 1, "p1"]),
        ("INSERT INTO t (a, b) VALUES (%s, %s), (%s, %s) ON CONFLICT DO NOTHING", [2, "p2", 3, "p3"]),
        ("INSERT INTO t (a, b) VALUES (%s, %s) ON CONFLICT DO NOTHING", [4, "p4"]),
    ]


def test_execute_values_uses_the_row_template():
    cur = MagicMock()

    common.execute_values(cur, "INSERT INTO t VALUES %s", [(1, "2026-01-01")], template="(%s, %s::date, NOW())")

    cur.execute.assert_called_once_with("INSERT INTO t VALUES (%s, %s::date, NOW())", [1, "2026-01-01"])


def test_execute_values_requires_the_placeholder():
    with pytest.raises(ValueError):
        common.execute_values(MagicMock(), "INSERT INTO t (a) SELECT %s", [(1,)])
