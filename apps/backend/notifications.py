"""Posts job failures to a chat webhook (Slack or Discord incoming webhook URL)."""

import os

import requests

from common import log

JOB_FAILURE_WEBHOOK_URL = os.environ.get("JOB_FAILURE_WEBHOOK_URL") or None


def failure_message(job, run_id, steps, error):
    failed = next((step for step in steps if step.get("status") == "failed"), None)
    lines = [f"{job} failed (run {run_id})", error or "Unknown error"]
    if failed and failed.get("error"):
        lines.append(f"{failed['name']}: {failed['error']}")
    lines.append("Resume it from the admin ops page or with POST /update-all/resume.")
    return "\n".join(lines)


def notify_job_failure(job, run_id, steps, error):
    """Best effort: never raises, so a broken webhook can't hide the original failure."""
    if not JOB_FAILURE_WEBHOOK_URL:
        return
    text = failure_message(job, run_id, steps, error)
    try:
        # Slack reads `text`, Discord reads `content`; each ignores the other.
        response = requests.post(JOB_FAILURE_WEBHOOK_URL, json={"text": text, "content": text}, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        log.warning("Could not send the job failure notification: %s", e)
