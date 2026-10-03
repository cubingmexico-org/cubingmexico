import psycopg2.pool
import pytest

import common


class FakeConn:
    def __init__(self):
        self.closed = 0
        self.commits = 0
        self.rollbacks = 0

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        self.closed = 1


class FakePool:
    def __init__(self, exhausted=False):
        self.exhausted = exhausted
        self.out = []
        self.returned = []

    def getconn(self):
        if self.exhausted:
            raise psycopg2.pool.PoolError("connection pool exhausted")
        conn = FakeConn()
        self.out.append(conn)
        return conn

    def putconn(self, conn, close=False):
        self.returned.append((conn, close))


@pytest.fixture
def fake_pool(monkeypatch):
    def _install(**kwargs):
        pool = FakePool(**kwargs)
        monkeypatch.setattr(common, "_pool", pool)
        return pool

    return _install


def test_commits_and_returns_to_pool(fake_pool):
    pool = fake_pool()
    with common.get_connection() as conn:
        pass
    assert conn.commits == 1
    assert pool.returned == [(conn, False)]


def test_rolls_back_and_returns_on_error(fake_pool):
    pool = fake_pool()
    with pytest.raises(ValueError), common.get_connection() as conn:
        raise ValueError("boom")
    assert conn.commits == 0
    assert conn.rollbacks == 1
    assert pool.returned == [(conn, False)]


def test_replaces_stale_connection(fake_pool):
    pool = fake_pool()
    stale = FakeConn()
    stale.closed = 1
    pool.out.append(stale)
    original_getconn = pool.getconn
    calls = iter([stale])
    pool.getconn = lambda: next(calls, None) or original_getconn()

    with common.get_connection() as conn:
        assert conn is not stale
    assert pool.returned[0] == (stale, True)


def test_falls_back_to_one_off_connection_when_exhausted(fake_pool, monkeypatch):
    fake_pool(exhausted=True)
    one_off = FakeConn()
    monkeypatch.setattr(common.psycopg2, "connect", lambda _dsn: one_off)

    with common.get_connection() as conn:
        assert conn is one_off
    assert one_off.commits == 1
    assert one_off.closed == 1
