"""Starts Cloud Run Job executions through the Cloud Run Admin API."""

import google.auth
from google.auth.transport.requests import AuthorizedSession

RUN_API = "https://run.googleapis.com/v2"


def run_job(job_name: str, args: list[str] | None = None) -> str:
    """Starts an execution of `job_name` (projects/P/locations/R/jobs/J) and returns its name.

    `args` replaces the container's default arguments for this execution only.
    """
    credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    session = AuthorizedSession(credentials)
    body = {"overrides": {"containerOverrides": [{"args": args}]}} if args else {}
    response = session.post(f"{RUN_API}/{job_name}:run", json=body, timeout=30)
    response.raise_for_status()
    operation = response.json()
    return operation.get("metadata", {}).get("name") or operation.get("name", "")
