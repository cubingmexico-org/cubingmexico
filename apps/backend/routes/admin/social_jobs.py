"""Cron endpoints that trigger scheduled social posts."""

from flask import jsonify

from common import log, require_cron_auth
from routes.admin.blueprint import admin_bp


@admin_bp.route("/post-summary-unlock", methods=["POST"])
@require_cron_auth
def post_summary_unlock_route():
    """Publish current-year summary unlock posts if Dec 20+ UTC and not yet posted."""
    try:
        from social.poster import post_summary_unlock_if_due

        result = post_summary_unlock_if_due()
        if result is None:
            return jsonify(
                {
                    "success": True,
                    "message": "Summary unlock not due or social posts disabled",
                    "posted": False,
                }
            )
        success = not result.get("errors")
        return jsonify(
            {
                "success": success,
                "posted": True,
                **result,
            }
        ), (200 if success else 502)
    except Exception as e:
        log.exception("post-summary-unlock failed: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@admin_bp.route("/post-weekly-digest", methods=["POST"])
@require_cron_auth
def post_weekly_digest_route():
    """Publish weekly digest for the current Mexico City ISO week if due.

    SR stats require `/update-state-records` to have run after the latest
    results import; `/update-all` posts SEMANA in that order automatically.
    """
    try:
        from social.poster import post_weekly_digest_if_due

        result = post_weekly_digest_if_due()
        if result is None:
            return jsonify(
                {
                    "success": True,
                    "message": "Weekly digest not due or social posts disabled",
                    "posted": False,
                }
            )
        if "weekly_digest_empty" in result.get("errors", []):
            return jsonify(
                {
                    "success": True,
                    "message": "Weekly digest empty — skipped",
                    "posted": False,
                    **result,
                }
            )
        success = not result.get("errors")
        return jsonify(
            {
                "success": success,
                "posted": True,
                **result,
            }
        ), (200 if success else 502)
    except Exception as e:
        log.exception("post-weekly-digest failed: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@admin_bp.route("/post-streaks-monthly", methods=["POST"])
@require_cron_auth
def post_streaks_monthly_route():
    """Publish monthly rachas spotlight on the month's last day (México) if due."""
    try:
        from social.poster import post_streaks_monthly_if_due

        result = post_streaks_monthly_if_due()
        if result is None:
            return jsonify(
                {
                    "success": True,
                    "message": "Monthly streaks not due or social posts disabled",
                    "posted": False,
                }
            )
        if "streaks_monthly_empty" in result.get("errors", []):
            return jsonify(
                {
                    "success": True,
                    "message": "Monthly streaks empty — skipped",
                    "posted": False,
                    **result,
                }
            )
        success = not result.get("errors")
        return jsonify(
            {
                "success": success,
                "posted": True,
                **result,
            }
        ), (200 if success else 502)
    except Exception as e:
        log.exception("post-streaks-monthly failed: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500


@admin_bp.route("/post-year-recap", methods=["POST"])
@require_cron_auth
def post_year_recap_route():
    """Publish the AÑO year recap + new year greeting on Dec 31 (México) if due."""
    try:
        from social.poster import post_year_recap_if_due

        result = post_year_recap_if_due()
        if result is None:
            return jsonify(
                {
                    "success": True,
                    "message": "Year recap not due or social posts disabled",
                    "posted": False,
                }
            )
        if "year_recap_empty" in result.get("errors", []):
            return jsonify(
                {
                    "success": True,
                    "message": "Year recap empty — skipped",
                    "posted": False,
                    **result,
                }
            )
        success = not result.get("errors")
        return jsonify(
            {
                "success": success,
                "posted": True,
                **result,
            }
        ), (200 if success else 502)
    except Exception as e:
        log.exception("post-year-recap failed: %s", e)
        return jsonify({"success": False, "message": str(e)}), 500
