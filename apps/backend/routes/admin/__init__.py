"""Cron-protected admin update routes."""

from routes.admin import (  # noqa: F401  (registers routes)
    rankings,
    schedules,
    social_jobs,
    state,
    update_all,
    wca_import,
)
from routes.admin.blueprint import admin_bp

__all__ = ["admin_bp"]
