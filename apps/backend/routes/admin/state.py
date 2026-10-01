"""State rankings and state records (SR)."""

import psycopg2
import psycopg2.extras
from flask import jsonify

from common import EXCLUDED_EVENTS, get_connection, log, require_cron_auth
from routes.admin.blueprint import admin_bp


@admin_bp.route("/update-state-ranks", methods=["POST"])
@require_cron_auth
def update_state_ranks():
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                cur.execute("UPDATE ranks_single SET state_rank = NULL")
                cur.execute("UPDATE ranks_average SET state_rank = NULL")
                log.info("State ranks reset for ranksSingle and ranksAverage")

                cur.execute("SELECT id, name FROM states")
                states = cur.fetchall()

                if EXCLUDED_EVENTS:
                    placeholders = ",".join(["%s"] * len(EXCLUDED_EVENTS))
                    query = f"SELECT id FROM events WHERE id NOT IN ({placeholders})"
                    cur.execute(query, EXCLUDED_EVENTS)
                else:
                    cur.execute("SELECT id FROM events")
                events = cur.fetchall()

                single_updates = []
                average_updates = []
                log.info("Starting computation of stateRank values for each state and event")

                for state_row in states:
                    state_name = state_row.name
                    log.info("Processing state: %s", state_name)

                    for event_row in events:
                        cur.execute(
                            """
                            SELECT rs.person_id, rs.event_id
                            FROM ranks_single rs
                            INNER JOIN persons p ON rs.person_id = p.wca_id
                            LEFT JOIN states st ON p.state_id = st.id
                            WHERE rs.country_rank <> 0
                              AND rs.event_id = %s
                              AND st.name = %s
                            ORDER BY rs.country_rank ASC
                            """,
                            (event_row.id, state_name),
                        )
                        single_data = cur.fetchall()

                        single_state_rank = 1
                        for record in single_data:
                            single_updates.append(
                                {
                                    "person_id": record.person_id,
                                    "event_id": record.event_id,
                                    "state_rank": single_state_rank,
                                }
                            )
                            single_state_rank += 1

                        cur.execute(
                            """
                            SELECT ra.person_id, ra.event_id
                            FROM ranks_average ra
                            INNER JOIN persons p ON ra.person_id = p.wca_id
                            LEFT JOIN states st ON p.state_id = st.id
                            WHERE ra.country_rank <> 0
                              AND ra.event_id = %s
                              AND st.name = %s
                            ORDER BY ra.country_rank ASC
                            """,
                            (event_row.id, state_name),
                        )
                        average_data = cur.fetchall()

                        average_state_rank = 1
                        for record in average_data:
                            average_updates.append(
                                {
                                    "person_id": record.person_id,
                                    "event_id": record.event_id,
                                    "state_rank": average_state_rank,
                                }
                            )
                            average_state_rank += 1

                log.info(
                    "Computed %s single_updates and %s average_updates",
                    len(single_updates),
                    len(average_updates),
                )

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("CREATE TEMP TABLE tmp_updates (person_id text, event_id text, state_rank int)")

                psycopg2.extras.execute_values(
                    cur,
                    "INSERT INTO tmp_updates (person_id, event_id, state_rank) VALUES %s",
                    [(u["person_id"], u["event_id"], u["state_rank"]) for u in single_updates],
                )

                cur.execute(
                    """
                    UPDATE ranks_single rs
                    SET state_rank = tmp_updates.state_rank
                    FROM tmp_updates
                    WHERE rs.person_id = tmp_updates.person_id
                    AND rs.event_id = tmp_updates.event_id
                """
                )

                cur.execute("CREATE TEMP TABLE tmp_avg_updates (person_id text, event_id text, state_rank int)")
                psycopg2.extras.execute_values(
                    cur,
                    "INSERT INTO tmp_avg_updates (person_id, event_id, state_rank) VALUES %s",
                    [(u["person_id"], u["event_id"], u["state_rank"]) for u in average_updates],
                )

                cur.execute(
                    """
                    UPDATE ranks_average ra
                    SET state_rank = tmp_avg_updates.state_rank
                    FROM tmp_avg_updates
                    WHERE ra.person_id = tmp_avg_updates.person_id
                    AND ra.event_id = tmp_avg_updates.event_id
                """
                )

        log.info("State rankings updated successfully")
        return jsonify({"success": True, "message": "State rankings updated successfully"})
    except Exception:
        log.exception("Error updating state rankings")
        return jsonify({"success": False, "message": "Error updating state rankings"}), 500


REGIONAL_RECORD_MARKERS = frozenset({"NR", "NAR", "WR"})


def _to_date_key(record_date):
    if hasattr(record_date, "isoformat"):
        return record_date.isoformat()[:10]
    return str(record_date)[:10]


def _is_regional_record(marker):
    if marker is None:
        return False
    return str(marker).strip() in REGIONAL_RECORD_MARKERS


def _mark_state_records(rows, out_ids):
    """Tag SR for chronological improvements.

    Same calendar day (round end date, else competition start_date) → only the
    best improvement that day is tagged (WCA 9i2).
    Results that already have NR/NAR/WR are not tagged SR, but still advance best_so_far.
    """
    best_so_far = None
    day_key = None
    day_candidates = []

    def flush_day():
        nonlocal best_so_far, day_candidates

        if not day_candidates:
            return

        improvements = [row for row in day_candidates if best_so_far is None or row.value <= best_so_far]

        if not improvements:
            day_candidates = []
            return

        day_best = min(row.value for row in improvements)

        for row in improvements:
            if row.value == day_best and not _is_regional_record(row.regional_record):
                out_ids.append(row.id)

        best_so_far = day_best
        day_candidates = []

    for row in rows:
        if row.value <= 0:
            continue

        key = _to_date_key(row.record_date)

        if day_key is not None and key != day_key:
            flush_day()

        day_key = key
        day_candidates.append(row)

    flush_day()


@admin_bp.route("/update-state-records", methods=["POST"])
@require_cron_auth
def update_state_records():
    """Recompute historical state record markers (SR) on results using current state membership."""
    single_sr_ids = []
    average_sr_ids = []
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Clearing all historical state record markers")
                cur.execute(
                    """
                    UPDATE results
                    SET state_single_record = NULL,
                        state_average_record = NULL
                    """
                )

                cur.execute("SELECT id, name FROM states")
                states = cur.fetchall()

                if EXCLUDED_EVENTS:
                    placeholders = ",".join(["%s"] * len(EXCLUDED_EVENTS))
                    query = f"SELECT id FROM events WHERE id NOT IN ({placeholders})"
                    cur.execute(query, EXCLUDED_EVENTS)
                else:
                    cur.execute("SELECT id FROM events")
                events = cur.fetchall()

                for state_row in states:
                    state_id = state_row.id
                    log.info("Computing historical state records for state: %s", state_row.name)

                    cur.execute(
                        "SELECT wca_id FROM persons WHERE state_id = %s",
                        (state_id,),
                    )
                    person_rows = cur.fetchall()
                    person_ids = [p.wca_id for p in person_rows]
                    if not person_ids:
                        continue

                    for event_row in events:
                        event_id = event_row.id

                        cur.execute(
                            """
                            SELECT r.id,
                                   r.best AS value,
                                   COALESCE(crd.end_date, c.start_date) AS record_date,
                                   r.regional_single_record AS regional_record
                            FROM results r
                            INNER JOIN competitions c ON r.competition_id = c.id
                            LEFT JOIN round_types rt ON r.round_type_id = rt.id
                            LEFT JOIN competition_round_dates crd
                              ON crd.competition_id = r.competition_id
                             AND crd.event_id = r.event_id
                             AND crd.round_type_id = r.round_type_id
                            WHERE r.event_id = %s
                              AND r.person_id = ANY(%s)
                              AND r.best > 0
                            ORDER BY COALESCE(crd.end_date, c.start_date) ASC,
                                     c.id ASC,
                                     COALESCE(rt.rank, 0) ASC,
                                     r.best ASC,
                                     r.id ASC
                            """,
                            (event_id, person_ids),
                        )
                        _mark_state_records(cur.fetchall(), single_sr_ids)

                        cur.execute(
                            """
                            SELECT r.id,
                                   r.average AS value,
                                   COALESCE(crd.end_date, c.start_date) AS record_date,
                                   r.regional_average_record AS regional_record
                            FROM results r
                            INNER JOIN competitions c ON r.competition_id = c.id
                            LEFT JOIN round_types rt ON r.round_type_id = rt.id
                            LEFT JOIN competition_round_dates crd
                              ON crd.competition_id = r.competition_id
                             AND crd.event_id = r.event_id
                             AND crd.round_type_id = r.round_type_id
                            WHERE r.event_id = %s
                              AND r.person_id = ANY(%s)
                              AND r.average > 0
                            ORDER BY COALESCE(crd.end_date, c.start_date) ASC,
                                     c.id ASC,
                                     COALESCE(rt.rank, 0) ASC,
                                     r.average ASC,
                                     r.id ASC
                            """,
                            (event_id, person_ids),
                        )
                        _mark_state_records(cur.fetchall(), average_sr_ids)

                chunk_size = 500
                regional_markers = tuple(REGIONAL_RECORD_MARKERS)
                for i in range(0, len(single_sr_ids), chunk_size):
                    chunk = single_sr_ids[i : i + chunk_size]
                    cur.execute(
                        """
                        UPDATE results
                        SET state_single_record = 'SR'
                        WHERE id = ANY(%s)
                          AND (
                            regional_single_record IS NULL
                            OR regional_single_record NOT IN %s
                          )
                        """,
                        (chunk, regional_markers),
                    )

                for i in range(0, len(average_sr_ids), chunk_size):
                    chunk = average_sr_ids[i : i + chunk_size]
                    cur.execute(
                        """
                        UPDATE results
                        SET state_average_record = 'SR'
                        WHERE id = ANY(%s)
                          AND (
                            regional_average_record IS NULL
                            OR regional_average_record NOT IN %s
                          )
                        """,
                        (chunk, regional_markers),
                    )

                conn.commit()

        log.info(
            "State records updated successfully (singles=%s, averages=%s)",
            len(single_sr_ids),
            len(average_sr_ids),
        )
        return jsonify(
            {
                "success": True,
                "message": "State records updated successfully",
                "singleCount": len(single_sr_ids),
                "averageCount": len(average_sr_ids),
            }
        )
    except Exception as e:
        log.exception("Error updating state records: %s", e)
        return jsonify({"success": False, "message": "Error updating state records"}), 500
