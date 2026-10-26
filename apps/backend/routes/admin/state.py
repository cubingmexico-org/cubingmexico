"""State rankings and state records (SR).

Both jobs run for every state after a WCA import, or for one state after a team edits its roster
(the web app calls the `/<state_id>` routes).
"""

import psycopg2
import psycopg2.extras
from flask import jsonify

from common import WITH_DEPRECATED_EVENTS_SUBQUERY, get_connection, job_response, log, require_cron_auth
from routes.admin.blueprint import admin_bp

STATE_MEMBERS_SUBQUERY = "(SELECT wca_id FROM persons WHERE state_id = ANY(%s))"


def _select_states(cur, state_ids):
    if state_ids is None:
        cur.execute("SELECT id, name FROM states ORDER BY id")
    else:
        cur.execute("SELECT id, name FROM states WHERE id = ANY(%s) ORDER BY id", (list(state_ids),))
    return cur.fetchall()


def _state_exists(state_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM states WHERE id = %s", (state_id,))
            return cur.fetchone() is not None


def _single_state_response(state_id, run, error_message):
    if not _state_exists(state_id):
        return jsonify({"success": False, "message": "Invalid stateId"}), 404
    return job_response(lambda: run([state_id]), error_message)


def _assign_sequential_ranks(rows):
    """Assign 1-based state ranks in the given order (already sorted by country rank)."""
    return [
        {"person_id": row.person_id, "event_id": row.event_id, "state_rank": index}
        for index, row in enumerate(rows, start=1)
    ]


def _write_state_ranks(cur, table, updates):
    cur.execute(f"CREATE TEMP TABLE tmp_{table} (person_id text, event_id text, state_rank int) ON COMMIT DROP")
    psycopg2.extras.execute_values(
        cur,
        f"INSERT INTO tmp_{table} (person_id, event_id, state_rank) VALUES %s",
        [(u["person_id"], u["event_id"], u["state_rank"]) for u in updates],
    )
    cur.execute(
        f"""
        UPDATE {table} r
        SET state_rank = tmp_{table}.state_rank
        FROM tmp_{table}
        WHERE r.person_id = tmp_{table}.person_id
        AND r.event_id = tmp_{table}.event_id
        """
    )


def run_update_state_ranks(state_ids=None):
    """Recompute state ranks for every state, or only for the current members of `state_ids`."""
    # One transaction: resetting and writing in separate ones would leave every state rank NULL on failure.
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            if state_ids is None:
                cur.execute("UPDATE ranks_single SET state_rank = NULL")
                cur.execute("UPDATE ranks_average SET state_rank = NULL")
            else:
                for table in ("ranks_single", "ranks_average"):
                    cur.execute(
                        f"UPDATE {table} SET state_rank = NULL WHERE person_id IN {STATE_MEMBERS_SUBQUERY}",
                        (list(state_ids),),
                    )
            log.info("State ranks reset for ranksSingle and ranksAverage")

            states = _select_states(cur, state_ids)

            cur.execute(f"SELECT id FROM events WHERE id IN {WITH_DEPRECATED_EVENTS_SUBQUERY}")
            events = cur.fetchall()

            single_updates = []
            average_updates = []
            log.info("Starting computation of stateRank values for each state and event")

            for state_row in states:
                log.info("Processing state: %s", state_row.name)

                for event_row in events:
                    cur.execute(
                        """
                        SELECT rs.person_id, rs.event_id
                        FROM ranks_single rs
                        INNER JOIN persons p ON rs.person_id = p.wca_id
                        WHERE rs.country_rank <> 0
                          AND rs.event_id = %s
                          AND p.state_id = %s
                        ORDER BY rs.country_rank ASC
                        """,
                        (event_row.id, state_row.id),
                    )
                    single_updates.extend(_assign_sequential_ranks(cur.fetchall()))

                    cur.execute(
                        """
                        SELECT ra.person_id, ra.event_id
                        FROM ranks_average ra
                        INNER JOIN persons p ON ra.person_id = p.wca_id
                        WHERE ra.country_rank <> 0
                          AND ra.event_id = %s
                          AND p.state_id = %s
                        ORDER BY ra.country_rank ASC
                        """,
                        (event_row.id, state_row.id),
                    )
                    average_updates.extend(_assign_sequential_ranks(cur.fetchall()))

            log.info(
                "Computed %s single_updates and %s average_updates",
                len(single_updates),
                len(average_updates),
            )

            _write_state_ranks(cur, "ranks_single", single_updates)
            _write_state_ranks(cur, "ranks_average", average_updates)

    log.info("State rankings updated successfully")
    return {
        "message": "State rankings updated successfully",
        "singleCount": len(single_updates),
        "averageCount": len(average_updates),
    }


@admin_bp.route("/update-state-ranks", methods=["POST"])
@require_cron_auth
def update_state_ranks():
    return job_response(run_update_state_ranks, "Error updating state rankings")


@admin_bp.route("/update-state-ranks/<state_id>", methods=["POST"])
@require_cron_auth
def update_one_state_ranks(state_id):
    return _single_state_response(state_id, run_update_state_ranks, "Error updating state rankings")


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


def run_update_state_records(state_ids=None):
    """Recompute historical state record markers (SR) on results using current state membership.

    With `state_ids`, only the current members of those states are cleared and retagged, and their
    ids are returned as `personIds` so the caller can invalidate their pages.
    """
    single_sr_ids = []
    average_sr_ids = []
    member_ids = []
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            if state_ids is None:
                log.info("Clearing all historical state record markers")
                cur.execute("UPDATE results SET state_single_record = NULL, state_average_record = NULL")
            else:
                log.info("Clearing historical state record markers for %s", state_ids)
                cur.execute(
                    f"""
                    UPDATE results
                    SET state_single_record = NULL, state_average_record = NULL
                    WHERE person_id IN {STATE_MEMBERS_SUBQUERY}
                    """,
                    (list(state_ids),),
                )

            states = _select_states(cur, state_ids)

            cur.execute(f"SELECT id FROM events WHERE id IN {WITH_DEPRECATED_EVENTS_SUBQUERY}")
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
                member_ids.extend(person_ids)

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

    log.info(
        "State records updated successfully (singles=%s, averages=%s)",
        len(single_sr_ids),
        len(average_sr_ids),
    )
    result = {
        "message": "State records updated successfully",
        "singleCount": len(single_sr_ids),
        "averageCount": len(average_sr_ids),
    }
    if state_ids is not None:
        result["personIds"] = member_ids
    return result


@admin_bp.route("/update-state-records", methods=["POST"])
@require_cron_auth
def update_state_records():
    return job_response(run_update_state_records, "Error updating state records")


@admin_bp.route("/update-state-records/<state_id>", methods=["POST"])
@require_cron_auth
def update_one_state_records(state_id):
    return _single_state_response(state_id, run_update_state_records, "Error updating state records")
