"""Run every update job in order, then due social posts, recording progress in `job_runs`."""

from flask import jsonify

import job_runs
from common import log, require_cron_auth
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
        step["finishedAt"] = job_runs.now_iso()
        if failed_step:
            break
        job_runs.record_steps(run_id, steps)

    if failed_step:
        message = f"Error occurred during {failed_step}"
        job_runs.finish_run(run_id, "failed", steps, error=message)
        return jsonify({"success": False, "message": message, "runId": run_id, "steps": steps}), 500

    job_runs.finish_run(run_id, "succeeded", steps)
    log.info("All updates executed successfully")
    return jsonify({"success": True, "message": "All updates executed successfully", "runId": run_id, "steps": steps})


def _start(steps, resumed_from=None):
    try:
        run_id = job_runs.start_run(JOB_NAME, steps, resumed_from=resumed_from)
    except job_runs.JobAlreadyRunning as e:
        return jsonify({"success": False, "message": "update-all is already running", "runId": e.run_id}), 409
    return _execute(run_id, steps)


@admin_bp.route("/update-all", methods=["POST"])
@require_cron_auth
def update_all():
    log.info("Starting all updates")
    return _start(job_runs.new_steps([name for name, _, _ in UPDATE_ALL_STEPS]))


@admin_bp.route("/update-all/resume", methods=["POST"])
@require_cron_auth
def resume_update_all():
    previous = job_runs.latest_run(JOB_NAME)
    if not previous or previous["status"] != "failed":
        return jsonify({"success": False, "message": "No failed update-all run to resume"}), 404

    done = {step["name"] for step in previous["steps"] if step["status"] in ("succeeded", "skipped")}
    log.info("Resuming update-all run %s, skipping %s", previous["id"], sorted(done))
    return _start(job_runs.new_steps([name for name, _, _ in UPDATE_ALL_STEPS], skipped=done), previous["id"])
