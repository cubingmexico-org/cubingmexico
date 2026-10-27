"""Error reporting to Sentry. Off unless SENTRY_DSN is set (local dev, tests, CI)."""

import logging
import os

import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.logging import LoggingIntegration


def init_sentry() -> bool:
    """Start the SDK once per process. Returns whether Sentry is on.

    Every handled failure in the backend goes through `log.exception` (the Flask error
    handler, each update-all step, social routes), so the logging integration turns
    ERROR records into events; capturing them again by hand would report them twice.
    """
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    if sentry_sdk.is_initialized():
        return True

    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT") or "production",
        # Cloud Run sets K_REVISION on the service and CLOUD_RUN_EXECUTION on the job.
        release=os.environ.get("K_REVISION") or os.environ.get("CLOUD_RUN_EXECUTION"),
        integrations=[
            FlaskIntegration(),
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        # Errors only: traces count against the free tier.
        traces_sample_rate=0.0,
        # Request bodies, local variables and query results can hold competitors' personal data.
        data_collection={
            "user_info": False,
            "cookies": {"mode": "off"},
            "http_bodies": [],
            "database_query_data": False,
            "stack_frame_variables": False,
        },
    )
    return True
