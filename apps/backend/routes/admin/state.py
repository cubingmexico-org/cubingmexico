"""State rankings and state records (SR).

Both jobs run for every state after a WCA import, or for one state after a team edits its roster
(the web app calls the `/<state_id>` routes).
"""

from itertools import groupby

from flask import jsonify

from common import WITH_DEPRECATED_EVENTS_SUBQUERY, get_connection, job_response, log, named_row, require_cron_auth
from routes.admin.blueprint import admin_bp

STATE_MEMBERS_SUBQUERY = "(SELECT wca_id FROM persons WHERE state_id = ANY(%s))"


def _state_filter(state_ids):
    """SQL condition on `p.state_id` and its params: every state, or only `state_ids`."""
    if state_ids is None:
        return "p.state_id IS NOT NULL", ()
    return "p.state_id = ANY(%s)", (list(state_ids),)


def _state_exists(state_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM states WHERE id = %s", (state_id,))
            return cur.fetchone() is not None


def _single_state_response(state_id, run, error_message):
    if not _state_exists(state_id):
        return jsonify({"success": False, "message": "Invalid stateId"}), 404
    return job_response(lambda: run([state_id]), error_message)


def _write_state_ranks(cur, table, state_ids):
    """Number each state's people 1, 2, 3... per event in country-rank order; returns the rows written."""
    state_condition, params = _state_filter(state_ids)
    cur.execute(
        f"""
        UPDATE {table} r
        SET state_rank = ranked.state_rank
        FROM (
            SELECT t.person_id,
                   t.event_id,
                   ROW_NUMBER() OVER (
                       PARTITION BY p.state_id, t.event_id
                       ORDER BY t.country_rank, t.person_id
                   ) AS state_rank
            FROM {table} t
            INNER JOIN persons p ON t.person_id = p.wca_id
            WHERE t.country_rank <> 0
              AND {state_condition}
              AND t.event_id IN {WITH_DEPRECATED_EVENTS_SUBQUERY}
        ) ranked
        WHERE r.person_id = ranked.person_id
          AND r.event_id = ranked.event_id
        """,
        params,
    )
    return cur.rowcount


def run_update_state_ranks(state_ids=None):
    """Recompute state ranks for every state, or only for the current members of `state_ids`."""
    # One transaction: resetting and writing in separate ones would leave every state rank NULL on failure.
    with get_connection() as conn:
        with conn.cursor() as cur:
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

            single_count = _write_state_ranks(cur, "ranks_single", state_ids)
            average_count = _write_state_ranks(cur, "ranks_average", state_ids)

    log.info("State rankings updated successfully (singles=%s, averages=%s)", single_count, average_count)
    return {
        "message": "State rankings updated successfully",
        "singleCount": single_count,
        "averageCount": average_count,
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


def _collect_state_records(conn, value_column, regional_column, state_ids, out_ids):
    """Stream every state member's results in record order and tag SR per (state, event)."""
    state_condition, params = _state_filter(state_ids)
    # A server-side cursor, so the full results history is never held in memory at once.
    with conn.cursor(name=f"state_records_{value_column}", row_factory=named_row) as cur:
        cur.itersize = 5000
        cur.execute(
            f"""
            SELECT r.id,
                   p.state_id,
                   r.event_id,
                   r.{value_column} AS value,
                   COALESCE(crd.end_date, c.start_date) AS record_date,
                   r.{regional_column} AS regional_record
            FROM results r
            INNER JOIN persons p ON r.person_id = p.wca_id
            INNER JOIN competitions c ON r.competition_id = c.id
            LEFT JOIN round_types rt ON r.round_type_id = rt.id
            LEFT JOIN competition_round_dates crd
              ON crd.competition_id = r.competition_id
             AND crd.event_id = r.event_id
             AND crd.round_type_id = r.round_type_id
            WHERE {state_condition}
              AND r.event_id IN {WITH_DEPRECATED_EVENTS_SUBQUERY}
              AND r.{value_column} > 0
            ORDER BY p.state_id ASC,
                     r.event_id ASC,
                     COALESCE(crd.end_date, c.start_date) ASC,
                     c.id ASC,
                     COALESCE(rt.rank, 0) ASC,
                     r.{value_column} ASC,
                     r.id ASC
            """,
            params,
        )
        for _, rows in groupby(cur, key=lambda row: (row.state_id, row.event_id)):
            _mark_state_records(rows, out_ids)


def run_update_state_records(state_ids=None):
    """Recompute historical state record markers (SR) on results using current state membership.

    With `state_ids`, only the current members of those states are cleared and retagged, and their
    ids are returned as `personIds` so the caller can invalidate their pages.
    """
    single_sr_ids = []
    average_sr_ids = []
    member_ids = []
    with get_connection() as conn:
        with conn.cursor(row_factory=named_row) as cur:
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

                cur.execute("SELECT wca_id FROM persons WHERE state_id = ANY(%s)", (list(state_ids),))
                member_ids = [row.wca_id for row in cur.fetchall()]

            log.info("Computing historical state records")
            _collect_state_records(conn, "best", "regional_single_record", state_ids, single_sr_ids)
            _collect_state_records(conn, "average", "regional_average_record", state_ids, average_sr_ids)

            chunk_size = 500
            regional_markers = list(REGIONAL_RECORD_MARKERS)
            for i in range(0, len(single_sr_ids), chunk_size):
                chunk = single_sr_ids[i : i + chunk_size]
                cur.execute(
                    """
                    UPDATE results
                    SET state_single_record = 'SR'
                    WHERE id = ANY(%s)
                      AND (
                        regional_single_record IS NULL
                        OR regional_single_record <> ALL(%s)
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
                        OR regional_average_record <> ALL(%s)
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
