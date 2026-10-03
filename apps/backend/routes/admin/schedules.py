"""Competition round schedules from public WCIF."""

import psycopg2
import psycopg2.extras
import requests
from flask import jsonify
from psycopg2.extras import execute_values

from common import get_connection, log, require_cron_auth
from routes.admin.blueprint import admin_bp
from utils import extract_round_end_dates_from_wcif


def _fetch_public_wcif(competition_id: str):
    url = f"https://www.worldcubeassociation.org/api/v0/competitions/{competition_id}/wcif/latest"
    response = requests.get(url, timeout=30)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


def _upsert_round_dates(cur, competition_id: str, rows: list[dict], source: str):
    if not rows:
        return 0
    values = [(competition_id, row["eventId"], row["roundTypeId"], row["endDate"], source) for row in rows]
    execute_values(
        cur,
        """
        INSERT INTO competition_round_dates
            (competition_id, event_id, round_type_id, end_date, source, updated_at)
        VALUES %s
        ON CONFLICT (competition_id, event_id, round_type_id) DO UPDATE
        SET end_date = EXCLUDED.end_date,
            source = EXCLUDED.source,
            updated_at = NOW()
        """,
        values,
        template="(%s, %s, %s, %s::date, %s, NOW())",
    )
    return len(values)


SCHEDULE_IMPORT_BATCH_SIZE = 50


def run_update_competition_schedules():
    """Import WCIF round end dates for competitions that have results and no schedule yet.

    Includes foreign competitions: the WCA export only stores Mexican persons'
    results, so any competition with rows in `results` is relevant for 9i2.
    """
    imported = 0
    skipped = 0
    failed = 0
    errors = []
    candidates = []

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            cur.execute(
                """
                SELECT c.id
                FROM competitions c
                WHERE EXISTS (
                        SELECT 1 FROM results r WHERE r.competition_id = c.id
                      )
                  AND NOT EXISTS (
                    SELECT 1
                    FROM competition_round_dates d
                    WHERE d.competition_id = c.id
                  )
                ORDER BY c.start_date DESC
                LIMIT %s
                """,
                (SCHEDULE_IMPORT_BATCH_SIZE,),
            )
            candidates = [row.id for row in cur.fetchall()]

            log.info(
                "Found %s competitions with results and no round dates (batch limit %s)",
                len(candidates),
                SCHEDULE_IMPORT_BATCH_SIZE,
            )

            for competition_id in candidates:
                try:
                    wcif = _fetch_public_wcif(competition_id)
                    if wcif is None:
                        skipped += 1
                        log.info("No public WCIF for %s; skipping", competition_id)
                        continue

                    rows = extract_round_end_dates_from_wcif(wcif)
                    if not rows:
                        skipped += 1
                        log.info("WCIF for %s has no extractable round dates", competition_id)
                        continue

                    count = _upsert_round_dates(cur, competition_id, rows, "wcif")
                    imported += 1
                    log.info("Imported %s round dates for %s", count, competition_id)
                except Exception as e:
                    failed += 1
                    errors.append({"competitionId": competition_id, "error": str(e)})
                    log.exception("Failed to import schedule for %s: %s", competition_id, e)

            conn.commit()

    return {
        "success": True,
        "message": "Competition schedules updated",
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "attempted": len(candidates),
        "errors": errors[:20],
    }


@admin_bp.route("/update-competition-schedules", methods=["POST"])
@require_cron_auth
def update_competition_schedules():
    try:
        return jsonify(run_update_competition_schedules())
    except Exception as e:
        log.exception("Error updating competition schedules: %s", e)
        return jsonify({"success": False, "message": "Error updating competition schedules"}), 500
