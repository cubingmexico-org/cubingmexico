"""Per-step progress of multi-step jobs, stored in `job_runs` so a failed run can resume.

Each helper uses its own short transaction, so progress is saved even when a step fails.
"""

import json
import uuid
from collections.abc import Collection
from datetime import UTC, datetime

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from common import get_connection
from notifications import notify_job_failure

# A run still marked `running` after this long crashed without finishing.
STALE_RUN_HOURS = 3


class JobAlreadyRunning(Exception):
    def __init__(self, run_id):
        super().__init__(f"Job run {run_id} is still running")
        self.run_id = run_id


def now_iso():
    return datetime.now(UTC).isoformat()


def jsonable(value):
    """Round-trips through JSON so dates and other values are stored as strings."""
    return json.loads(json.dumps(value, default=str))


def new_steps(names, skipped: Collection[str] = ()):
    return [
        {
            "name": name,
            "status": "skipped" if name in skipped else "pending",
            "startedAt": None,
            "finishedAt": None,
        }
        for name in names
    ]


def _lock_job(cur, job):
    """Serializes starts of the same job until the transaction ends."""
    cur.execute("SELECT pg_advisory_xact_lock(hashtext(%s))", (f"job_runs:{job}",))


def _mark_stale_runs_failed(cur, job):
    cur.execute(
        """
        UPDATE job_runs
        SET status = 'failed', error = 'Stale: never finished', finished_at = NOW()
        WHERE job = %s AND status = 'running'
          AND started_at <= NOW() - make_interval(hours => %s)
        """,
        (job, STALE_RUN_HOURS),
    )


def mark_stale_runs_failed(job):
    """Fails `running` rows left behind by a crash, so they can be resumed."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            _lock_job(cur, job)
            _mark_stale_runs_failed(cur, job)


def start_run(job, steps, resumed_from=None):
    """Creates a `running` row. Raises JobAlreadyRunning if a recent run hasn't finished."""
    run_id = str(uuid.uuid4())
    with get_connection() as conn:
        with conn.cursor() as cur:
            _lock_job(cur, job)
            _mark_stale_runs_failed(cur, job)
            cur.execute(
                """
                SELECT id FROM job_runs
                WHERE job = %s AND status = 'running'
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (job,),
            )
            active = cur.fetchone()
            if active:
                raise JobAlreadyRunning(active[0])
            cur.execute(
                """
                INSERT INTO job_runs (id, job, status, steps, resumed_from)
                VALUES (%s, %s, 'running', %s, %s)
                """,
                (run_id, job, Jsonb(steps), resumed_from),
            )
    return run_id


def record_steps(run_id, steps):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE job_runs SET steps = %s WHERE id = %s", (Jsonb(steps), run_id))


def finish_run(run_id, status, steps, error=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE job_runs
                SET status = %s, steps = %s, error = %s, finished_at = NOW()
                WHERE id = %s
                RETURNING job
                """,
                (status, Jsonb(steps), error, run_id),
            )
            row = cur.fetchone()
    if status == "failed" and row:
        notify_job_failure(row[0], run_id, steps, error)


def latest_run(job):
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, status, steps FROM job_runs
                WHERE job = %s
                ORDER BY started_at DESC
                LIMIT 1
                """,
                (job,),
            )
            return cur.fetchone()
