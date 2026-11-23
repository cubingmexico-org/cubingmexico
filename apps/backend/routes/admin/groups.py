"""Group rankings and group record markers (communities + sponsor teams).

Jobs run for every group after a WCA import, or for one group after a roster edit
(the web app calls the `/<group_id>` routes).
"""

from itertools import groupby

from flask import jsonify

from common import WITH_DEPRECATED_EVENTS_SUBQUERY, get_connection, job_response, log, named_row, require_cron_auth
from routes.admin.blueprint import admin_bp
from routes.admin.state import REGIONAL_RECORD_MARKERS, _mark_state_records


def _group_filter(group_ids):
    """SQL condition on `gm.group_id` and its params: every group, or only `group_ids`."""
    if group_ids is None:
        return "TRUE", ()
    return "gm.group_id = ANY(%s)", (list(group_ids),)


def _group_exists(group_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM groups WHERE id = %s", (group_id,))
            return cur.fetchone() is not None


def _single_group_response(group_id, run, error_message):
    if not _group_exists(group_id):
        return jsonify({"success": False, "message": "Invalid groupId"}), 404
    return job_response(lambda: run([group_id]), error_message)


def _write_group_ranks(cur, source_table, dest_table, group_ids):
    """Number each group's people 1, 2, 3... per event in country-rank order."""
    group_condition, params = _group_filter(group_ids)
    cur.execute(
        f"""
        INSERT INTO {dest_table} (group_id, person_id, event_id, best, group_rank)
        SELECT ranked.group_id,
               ranked.person_id,
               ranked.event_id,
               ranked.best,
               ranked.group_rank
        FROM (
            SELECT gm.group_id,
                   t.person_id,
                   t.event_id,
                   t.best,
                   ROW_NUMBER() OVER (
                       PARTITION BY gm.group_id, t.event_id
                       ORDER BY t.country_rank, t.person_id
                   ) AS group_rank
            FROM {source_table} t
            INNER JOIN group_memberships gm ON gm.person_id = t.person_id
            WHERE t.country_rank <> 0
              AND {group_condition}
              AND t.event_id IN {WITH_DEPRECATED_EVENTS_SUBQUERY}
        ) ranked
        """,
        params,
    )
    return cur.rowcount


def run_update_group_ranks(group_ids=None):
    """Recompute group ranks for every group, or only for `group_ids`."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            if group_ids is None:
                cur.execute("DELETE FROM group_ranks_single")
                cur.execute("DELETE FROM group_ranks_average")
            else:
                cur.execute(
                    "DELETE FROM group_ranks_single WHERE group_id = ANY(%s)",
                    (list(group_ids),),
                )
                cur.execute(
                    "DELETE FROM group_ranks_average WHERE group_id = ANY(%s)",
                    (list(group_ids),),
                )
            log.info("Group ranks reset")

            single_count = _write_group_ranks(cur, "ranks_single", "group_ranks_single", group_ids)
            average_count = _write_group_ranks(cur, "ranks_average", "group_ranks_average", group_ids)

    log.info(
        "Group rankings updated successfully (singles=%s, averages=%s)",
        single_count,
        average_count,
    )
    return {
        "message": "Group rankings updated successfully",
        "singleCount": single_count,
        "averageCount": average_count,
    }


@admin_bp.route("/update-group-ranks", methods=["POST"])
@require_cron_auth
def update_group_ranks():
    return job_response(run_update_group_ranks, "Error updating group rankings")


@admin_bp.route("/update-group-ranks/<group_id>", methods=["POST"])
@require_cron_auth
def update_one_group_ranks(group_id):
    return _single_group_response(group_id, run_update_group_ranks, "Error updating group rankings")


def _collect_group_records(conn, value_column, regional_column, group_ids, out_pairs):
    """Stream every group member's results and tag records per (group, event)."""
    group_condition, params = _group_filter(group_ids)
    with conn.cursor(name=f"group_records_{value_column}", row_factory=named_row) as cur:
        cur.itersize = 5000
        cur.execute(
            f"""
            SELECT r.id,
                   gm.group_id,
                   r.event_id,
                   r.{value_column} AS value,
                   COALESCE(crd.end_date, c.start_date) AS record_date,
                   r.{regional_column} AS regional_record
            FROM results r
            INNER JOIN group_memberships gm ON gm.person_id = r.person_id
            INNER JOIN competitions c ON r.competition_id = c.id
            LEFT JOIN round_types rt ON r.round_type_id = rt.id
            LEFT JOIN competition_round_dates crd
              ON crd.competition_id = r.competition_id
             AND crd.event_id = r.event_id
             AND crd.round_type_id = r.round_type_id
            WHERE {group_condition}
              AND r.event_id IN {WITH_DEPRECATED_EVENTS_SUBQUERY}
              AND r.{value_column} > 0
            ORDER BY gm.group_id ASC,
                     r.event_id ASC,
                     COALESCE(crd.end_date, c.start_date) ASC,
                     c.id ASC,
                     COALESCE(rt.rank, 0) ASC,
                     r.{value_column} ASC,
                     r.id ASC
            """,
            params,
        )
        for (group_id, _event_id), rows in groupby(cur, key=lambda row: (row.group_id, row.event_id)):
            marked_ids = []
            _mark_state_records(list(rows), marked_ids)
            for result_id in marked_ids:
                out_pairs.append((group_id, result_id))


def run_update_group_records(group_ids=None):
    """Recompute historical group record markers using current membership."""
    single_pairs = []
    average_pairs = []
    member_ids = []
    with get_connection() as conn:
        with conn.cursor(row_factory=named_row) as cur:
            if group_ids is None:
                log.info("Clearing all historical group record markers")
                cur.execute("DELETE FROM group_record_markers")
            else:
                log.info("Clearing historical group record markers for %s", group_ids)
                cur.execute(
                    "DELETE FROM group_record_markers WHERE group_id = ANY(%s)",
                    (list(group_ids),),
                )
                cur.execute(
                    "SELECT DISTINCT person_id FROM group_memberships WHERE group_id = ANY(%s)",
                    (list(group_ids),),
                )
                member_ids = [row.person_id for row in cur.fetchall()]

            log.info("Computing historical group records")
            _collect_group_records(conn, "best", "regional_single_record", group_ids, single_pairs)
            _collect_group_records(conn, "average", "regional_average_record", group_ids, average_pairs)

            chunk_size = 500
            regional_markers = list(REGIONAL_RECORD_MARKERS)

            def _insert_markers(pairs, record_type):
                for i in range(0, len(pairs), chunk_size):
                    chunk = pairs[i : i + chunk_size]
                    cur.execute(
                        """
                        INSERT INTO group_record_markers (group_id, result_id, record_type)
                        SELECT v.group_id, v.result_id, %s
                        FROM UNNEST(%s::text[], %s::text[]) AS v(group_id, result_id)
                        INNER JOIN results r ON r.id = v.result_id
                        WHERE (
                            CASE
                              WHEN %s = 'single' THEN (
                                r.regional_single_record IS NULL
                                OR r.regional_single_record <> ALL(%s)
                              )
                              ELSE (
                                r.regional_average_record IS NULL
                                OR r.regional_average_record <> ALL(%s)
                              )
                            END
                        )
                        ON CONFLICT DO NOTHING
                        """,
                        (
                            record_type,
                            [p[0] for p in chunk],
                            [p[1] for p in chunk],
                            record_type,
                            regional_markers,
                            regional_markers,
                        ),
                    )

            _insert_markers(single_pairs, "single")
            _insert_markers(average_pairs, "average")

    log.info(
        "Group records updated successfully (singles=%s, averages=%s)",
        len(single_pairs),
        len(average_pairs),
    )
    result = {
        "message": "Group records updated successfully",
        "singleCount": len(single_pairs),
        "averageCount": len(average_pairs),
    }
    if group_ids is not None:
        result["personIds"] = member_ids
    return result


@admin_bp.route("/update-group-records", methods=["POST"])
@require_cron_auth
def update_group_records():
    return job_response(run_update_group_records, "Error updating group records")


@admin_bp.route("/update-group-records/<group_id>", methods=["POST"])
@require_cron_auth
def update_one_group_records(group_id):
    return _single_group_response(group_id, run_update_group_records, "Error updating group records")
