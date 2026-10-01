"""Run every update job in order, then due social posts."""

from flask import jsonify

from common import log, require_cron_auth
from routes.admin.blueprint import admin_bp
from routes.admin.rankings import update_kinch_ranks, update_nemesis_stats, update_streak_ranks, update_sum_of_ranks
from routes.admin.schedules import update_competition_schedules
from routes.admin.state import update_state_ranks, update_state_records
from routes.admin.wca_import import update_full_database


@admin_bp.route("/update-all", methods=["POST"])
@require_cron_auth
def update_all():
    try:
        log.info("Starting all updates")
        updates = [
            ("update_full_database", update_full_database),
            ("update_competition_schedules", update_competition_schedules),
            ("update_state_ranks", update_state_ranks),
            ("update_state_records", update_state_records),
            ("update_sum_of_ranks", update_sum_of_ranks),
            ("update_kinch_ranks", update_kinch_ranks),
            ("update_streak_ranks", update_streak_ranks),
            ("update_nemesis_stats", update_nemesis_stats),
        ]
        details = {}
        for name, func in updates:
            log.info("Starting update: %s", name)
            result = func()
            if isinstance(result, tuple) and len(result) == 2:
                json_data, status_code = result
            else:
                json_data = result.get_json()
                status_code = result.status_code

            details[name] = {"status": status_code, "result": json_data}
            log.info("Completed update: %s with status %s", name, status_code)
            if status_code != 200:
                log.error("Error occurred during %s: %s", name, json_data)
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Error occurred during {name}",
                            "details": details,
                        }
                    ),
                    status_code,
                )

        try:
            from social.poster import post_streaks_monthly_if_due, post_weekly_digest_if_due, post_year_recap_if_due

            post_weekly_digest_if_due()
            post_streaks_monthly_if_due()
            post_year_recap_if_due()
        except Exception as e:
            log.exception(
                "Social WEEKLY_DIGEST/STREAKS_MONTHLY/YEAR_RECAP posting failed (update-all succeeded): %s",
                e,
            )

        log.info("All updates executed successfully")
        return jsonify(
            {
                "success": True,
                "message": "All updates executed successfully",
                "details": details,
            }
        )
    except Exception as e:
        log.exception("Unhandled error in update_all: %s", e)
        return jsonify({"success": False, "message": "Error occurred during update_all"}), 500
