"""Run every update job in order, then due social posts, recording progress in `job_runs`.

In production `/update-all` starts the `UPDATE_ALL_JOB` Cloud Run Job (see run_job.py), which runs
`run_update_all` outside any HTTP request; without it, the routes run the pipeline in the request.
"""

from typing import Any

from flask import jsonify

import job_runs
from cloud_run_jobs import run_job
from common import UPDATE_ALL_JOB, log, require_cron_auth
from routes.admin.blueprint import admin_bp
from routes.admin.cubing_contests import run_update_cubing_contests
from routes.admin.rankings import (
    run_update_kinch_ranks,
    run_update_nemesis_stats,
    run_update_streak_ranks,
    run_update_sum_of_ranks,
)
from routes.admin.schedules import run_update_competition_schedules
from routes.admin.state import run_update_state_ranks, run_update_state_records
from routes.admin.wca_import import run_update_full_database
from web_cache import UPDATE_ALL_TAGS, revalidate_web_tags

JOB_NAME = "update_all"


def _run_cubing_contests():
    payload, status = run_update_cubing_contests()
    if status != 200:
        raise RuntimeError(payload.get("message", "Cubing Contests import failed"))
    return payload


def _post_due_social():
    from social.poster import post_streaks_monthly_if_due, post_weekly_digest_if_due, post_year_recap_if_due

    return {
        "weeklyDigest": post_weekly_digest_if_due(),
        "streaksMonthly": post_streaks_monthly_if_due(),
        "yearRecap": post_year_recap_if_due(),
    }


# (name, run function, required). A required step's failure stops the run; the others are only recorded.
UPDATE_ALL_STEPS = [
    ("update_full_database", run_update_full_database, True),
    ("update_competition_schedules", run_update_competition_schedules, True),
    ("update_state_ranks", run_update_state_ranks, True),
    ("update_state_records", run_update_state_records, True),
    ("update_sum_of_ranks", run_update_sum_of_ranks, True),
    ("update_kinch_ranks", run_update_kinch_ranks, True),
    ("update_streak_ranks", run_update_streak_ranks, True),
    ("update_nemesis_stats", run_update_nemesis_stats, True),
    ("update_cubing_contests", _run_cubing_contests, False),
    ("post_due_social", _post_due_social, False),
]


def _step_names():
    return [name for name, _, _ in UPDATE_ALL_STEPS]


def _execute(run_id, steps):
    failed_step = None
    for step, (name, run, required) in zip(steps, UPDATE_ALL_STEPS, strict=True):
        if step["status"] == "skipped":
            continue
        log.info("Starting update: %s", name)
        step.update(status="running", startedAt=job_runs.now_iso())
        job_runs.record_steps(run_id, steps)
        try:
            step["result"] = job_runs.jsonable(run() or {})
            step["status"] = "succeeded"
            log.info("Completed update: %s", name)
        except Exception as e:
            log.exception("Error occurred during %s", name)
            step.update(status="failed", error=str(e) or type(e).__name__)
            if required:
                failed_step = name
        except BaseException:
            # SIGTERM (see run_job.py) or Ctrl+C: record the failure so the run can be resumed.
            log.error("update-all run %s was interrupted during %s", run_id, name)
            step.update(status="failed", error="Interrupted", finishedAt=job_runs.now_iso())
            job_runs.finish_run(run_id, "failed", steps, error=f"Interrupted during {name}")
            raise
        step["finishedAt"] = job_runs.now_iso()
        if failed_step:
            break
        job_runs.record_steps(run_id, steps)

    if failed_step:
        message = f"Error occurred during {failed_step}"
        job_runs.finish_run(run_id, "failed", steps, error=message)
        return {"success": False, "message": message, "runId": run_id, "steps": steps}, 500

    job_runs.finish_run(run_id, "succeeded", steps)
    log.info("All updates executed successfully")
    revalidate_web_tags(UPDATE_ALL_TAGS)
    return {"success": True, "message": "All updates executed successfully", "runId": run_id, "steps": steps}, 200


def _latest_run():
    job_runs.mark_stale_runs_failed(JOB_NAME)
    return job_runs.latest_run(JOB_NAME)


def _already_running(latest):
    if latest and latest["status"] == "running":
        return {"success": False, "message": "update-all is already running", "runId": latest["id"]}, 409
    return None


def _resume_error(latest):
    """Error response when the latest run can't be resumed, else None."""
    if error := _already_running(latest):
        return error
    if not latest or latest["status"] != "failed":
        return {"success": False, "message": "No failed update-all run to resume"}, 404
    return None


def run_update_all(resume: bool = False) -> tuple[dict[str, Any], int]:
    """Runs the pipeline in this process. Returns (body, HTTP status)."""
    resumed_from = None
    skipped = ()
    if resume:
        previous = _latest_run()
        if error := _resume_error(previous):
            return error
        assert previous is not None
        skipped = {step["name"] for step in previous["steps"] if step["status"] in ("succeeded", "skipped")}
        resumed_from = previous["id"]
        log.info("Resuming update-all run %s, skipping %s", resumed_from, sorted(skipped))
    else:
        log.info("Starting all updates")

    steps = job_runs.new_steps(_step_names(), skipped=skipped)
    try:
        run_id = job_runs.start_run(JOB_NAME, steps, resumed_from=resumed_from)
    except job_runs.JobAlreadyRunning as e:
        return {"success": False, "message": "update-all is already running", "runId": e.run_id}, 409
    return _execute(run_id, steps)


def _start_job(job_name, resume):
    """Starts a Cloud Run Job execution after the same checks the job itself makes."""
    latest = _latest_run()
    if error := _resume_error(latest) if resume else _already_running(latest):
        return error

    args = ["update-all", "--resume"] if resume else ["update-all"]
    execution = run_job(job_name, args)
    log.info("Started %s execution %s", job_name, execution)
    return {"success": True, "message": "update-all started", "execution": execution}, 202


def _respond(resume):
    if UPDATE_ALL_JOB:
        body, status = _start_job(UPDATE_ALL_JOB, resume)
    else:
        body, status = run_update_all(resume=resume)
    return jsonify(body), status


@admin_bp.route("/update-all", methods=["POST"])
@require_cron_auth
def update_all():
    return _respond(resume=False)


@admin_bp.route("/update-all/resume", methods=["POST"])
@require_cron_auth
def resume_update_all():
    return _respond(resume=True)
