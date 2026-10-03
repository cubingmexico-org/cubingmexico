"""Derived rankings: sum of ranks, Kinch, PR streaks, nemesis stats."""

import psycopg2
import psycopg2.extras
from flask import jsonify
from psycopg2.extras import execute_values

from common import EXCLUDED_EVENTS, SINGLE_EVENTS, get_connection, log, require_cron_auth
from nemesis_stats import compute_nemesis_stats
from routes.admin.blueprint import admin_bp


@admin_bp.route("/update-sum-of-ranks", methods=["POST"])
@require_cron_auth
def update_sum_of_ranks():
    try:
        log.info("Starting sum of ranks update")
        excluded = ",".join(f"'{e}'" for e in EXCLUDED_EVENTS)

        single_query = f"""
        WITH all_events AS (
          SELECT DISTINCT event_id FROM ranks_single
          WHERE event_id NOT IN ({excluded})
        ),
        all_people AS (
          SELECT DISTINCT wca_id, name FROM persons
        ),
        people_events AS (
          SELECT all_people.wca_id, all_people.name, all_events.event_id
          FROM all_people CROSS JOIN all_events
        )
        SELECT
          pe.wca_id,
          pe.name,
          json_agg(
            json_build_object(
              'eventId', pe.event_id,
              'countryRank', COALESCE(NULLIF(rs.country_rank, 0), wr.worst_rank),
              'completed', CASE WHEN rs.country_rank IS NULL OR rs.country_rank = 0 THEN false ELSE true END
            )
          ) AS events,
          SUM(COALESCE(NULLIF(rs.country_rank, 0), wr.worst_rank)) AS overall
        FROM people_events pe
        LEFT JOIN ranks_single rs
            ON pe.wca_id = rs.person_id AND pe.event_id = rs.event_id
        LEFT JOIN (
          SELECT event_id, MAX(country_rank) + 1 AS worst_rank
          FROM ranks_single
          GROUP BY event_id
        ) AS wr
            ON wr.event_id = pe.event_id
        GROUP BY pe.wca_id, pe.name
        ORDER BY overall
        """

        average_query = f"""
        WITH all_events AS (
          SELECT DISTINCT event_id FROM ranks_average
          WHERE event_id NOT IN ({excluded})
        ),
        all_people AS (
          SELECT DISTINCT wca_id, name FROM persons
        ),
        people_events AS (
          SELECT all_people.wca_id, all_people.name, all_events.event_id
          FROM all_people CROSS JOIN all_events
        )
        SELECT
          pe.wca_id,
          pe.name,
          json_agg(
            json_build_object(
              'eventId', pe.event_id,
              'countryRank', COALESCE(NULLIF(ra.country_rank, 0), wr.worst_rank),
              'completed', CASE WHEN ra.country_rank IS NULL OR ra.country_rank = 0 THEN false ELSE true END
            )
          ) AS events,
          SUM(COALESCE(NULLIF(ra.country_rank, 0), wr.worst_rank)) AS overall
        FROM people_events pe
        LEFT JOIN ranks_average ra
            ON pe.wca_id = ra.person_id AND pe.event_id = ra.event_id
        LEFT JOIN (
          SELECT event_id, MAX(country_rank) + 1 AS worst_rank
          FROM ranks_average
          GROUP BY event_id
        ) AS wr
            ON wr.event_id = pe.event_id
        GROUP BY pe.wca_id, pe.name
        ORDER BY overall
        """

        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Deleting existing sum_of_ranks records for single results")
                cur.execute("DELETE FROM sum_of_ranks WHERE result_type = %s", ("single",))
                log.info("Executing single query")
                cur.execute(single_query)
                persons = cur.fetchall()
                log.info("Fetched %s record(s) for single results", len(persons))
                rank = 1
                for row in persons:
                    cur.execute(
                        """
                        INSERT INTO sum_of_ranks (rank, person_id, result_type, overall, events)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (rank, row.wca_id, "single", row.overall, psycopg2.extras.Json(row.events)),
                    )
                    rank += 1
                conn.commit()

        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Deleting existing sum_of_ranks records for average results")
                cur.execute("DELETE FROM sum_of_ranks WHERE result_type = %s", ("average",))
                log.info("Executing average query")
                cur.execute(average_query)
                persons = cur.fetchall()
                log.info("Fetched %s record(s) for average results", len(persons))
                rank = 1
                for row in persons:
                    cur.execute(
                        """
                        INSERT INTO sum_of_ranks (rank, person_id, result_type, overall, events)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (rank, row.wca_id, "average", row.overall, psycopg2.extras.Json(row.events)),
                    )
                    rank += 1
                conn.commit()

        log.info("Sum of ranks updated successfully")
        return jsonify({"success": True, "message": "Sum of ranks updated successfully"})
    except Exception as e:
        log.exception("Error updating sum of ranks: %s", e)
        return jsonify({"success": False, "message": "Error updating sum of ranks"}), 500


@admin_bp.route("/update-kinch-ranks", methods=["POST"])
@require_cron_auth
def update_kinch_ranks():
    try:
        log.info("Starting kinch ranks update")

        excluded = ",".join(f"'{e}'" for e in EXCLUDED_EVENTS)
        single_events = ",".join(f"'{e}'" for e in SINGLE_EVENTS)

        query = f"""
        WITH PersonalRecords AS (
          SELECT
            person_id,
            event_id,
            MIN(best) AS personal_best,
            'average' AS type
          FROM ranks_average
          WHERE event_id NOT IN ({excluded})
          GROUP BY person_id, event_id
          UNION ALL
          SELECT
            person_id,
            event_id,
            MIN(best) AS personal_best,
            'single' AS type
          FROM ranks_single
          WHERE event_id IN ({single_events})
          GROUP BY person_id, event_id
        ),
        NationalRecords AS (
          SELECT
            event_id,
            MIN(best) AS national_best,
            'average' AS type
          FROM ranks_average
          WHERE country_rank = 1 AND event_id NOT IN ({excluded})
          GROUP BY event_id
          UNION ALL
          SELECT
            event_id,
            MIN(best) AS national_best,
            'single' AS type
          FROM ranks_single
          WHERE country_rank = 1 AND event_id IN ({single_events})
          GROUP BY event_id
        ),
        Persons AS (
          SELECT DISTINCT person_id FROM ranks_single
        ),
        Events AS (
          SELECT id FROM events WHERE id NOT IN ({excluded})
        ),
        Ratios AS (
          SELECT
            p.person_id,
            e.id AS event_id,
            MAX(
                CASE
                WHEN e.id = '333mbf' THEN
                    CASE
                    WHEN COALESCE(pr.personal_best, 0) != 0 THEN
                        ((99 - CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 1, 2) AS FLOAT) +
                        (1 - (CAST(SUBSTRING(CAST(pr.personal_best AS TEXT), 3, 5) AS FLOAT) / 3600))) /
                        ((99 - CAST(SUBSTRING(CAST(nr.national_best AS TEXT), 1, 2) AS FLOAT)) +
                        (1 - (CAST(SUBSTRING(CAST(nr.national_best AS TEXT), 3, 5) AS FLOAT) / 3600)))) * 100
                    ELSE 0
                    END
                WHEN COALESCE(pr.personal_best, 0) != 0 THEN
                    (nr.national_best / COALESCE(pr.personal_best, 0)::FLOAT) * 100
                    ELSE 0
                END
                ) AS best_ratio
          FROM Persons p
          CROSS JOIN Events e
          LEFT JOIN PersonalRecords pr ON p.person_id = pr.person_id AND e.id = pr.event_id
          LEFT JOIN NationalRecords nr ON e.id = nr.event_id AND pr.type = nr.type
          GROUP BY p.person_id, e.id
        )
        SELECT
          r.person_id AS id,
          json_agg(
            json_build_object(
              'eventId', r.event_id,
              'ratio', r.best_ratio
            )
          ) AS events,
          AVG(r.best_ratio) AS overall
        FROM Ratios r
        GROUP BY r.person_id
        ORDER BY overall DESC;
        """

        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Deleting existing kinch_ranks records")
                cur.execute("DELETE FROM kinch_ranks")

                log.info("Executing kinch ranks query")
                cur.execute(query)
                persons = cur.fetchall()
                log.info("Fetched %s record(s) for updating kinch ranks", len(persons))

                for index, row in enumerate(persons):
                    cur.execute(
                        """
                        INSERT INTO kinch_ranks (rank, person_id, overall, events)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (index + 1, row.id, row.overall, psycopg2.extras.Json(row.events)),
                    )

        log.info("Kinch ranks updated successfully")
        return jsonify({"success": True, "message": "Kinch ranks updated successfully"})
    except Exception as e:
        log.exception("Error updating kinch ranks: %s", e)
        return jsonify({"success": False, "message": "Error updating kinch ranks"}), 500


def _is_personal_record(event_id, result, records):
    """Return True if result sets or ties a PR for the event (CubingApp rules)."""
    if result == 0 or result == -1:
        return False
    if event_id not in records:
        return True
    return result <= records[event_id]


def _compute_person_streaks(rows):
    """
    Compute current and longest PR streaks for one person.
    rows: iterable of (competition_id, event_id, best, average) in chronological order.
    """
    best_singles = {}
    best_averages = {}
    current_streak = 0
    longest_streak = 0

    competition_id = None
    competition_results = []

    def flush_competition(results):
        nonlocal current_streak, longest_streak
        if not results:
            return
        record_attained = False
        for event_id, best, average in results:
            if _is_personal_record(event_id, best, best_singles):
                best_singles[event_id] = best
                record_attained = True
            if _is_personal_record(event_id, average, best_averages):
                best_averages[event_id] = average
                record_attained = True
        if record_attained:
            current_streak += 1
            if current_streak > longest_streak:
                longest_streak = current_streak
        else:
            current_streak = 0

    for row_competition_id, event_id, best, average in rows:
        if competition_id is None:
            competition_id = row_competition_id
        if row_competition_id != competition_id:
            flush_competition(competition_results)
            competition_id = row_competition_id
            competition_results = []
        competition_results.append((event_id, best, average))

    flush_competition(competition_results)
    return current_streak, longest_streak


@admin_bp.route("/update-streak-ranks", methods=["POST"])
@require_cron_auth
def update_streak_ranks():
    try:
        log.info("Starting streak ranks update")

        query = """
        SELECT r.person_id, r.competition_id, r.event_id, r.best, r.average
        FROM results r
        JOIN competitions c ON c.id = r.competition_id
        ORDER BY r.person_id, c.start_date ASC, r.competition_id ASC
        """

        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching results for streak computation")
                cur.execute(query)
                rows = cur.fetchall()
                log.info("Fetched %s result row(s) for streak ranks", len(rows))

                streaks = []
                current_person_id = None
                person_rows = []

                def flush_person(person_id, person_result_rows):
                    if person_id is None:
                        return
                    current, longest = _compute_person_streaks(person_result_rows)
                    streaks.append((person_id, current, longest))

                for row in rows:
                    if current_person_id is None:
                        current_person_id = row.person_id
                    if row.person_id != current_person_id:
                        flush_person(current_person_id, person_rows)
                        current_person_id = row.person_id
                        person_rows = []
                    person_rows.append((row.competition_id, row.event_id, row.best, row.average))

                flush_person(current_person_id, person_rows)

                # Rank by longest DESC, then current DESC, then person_id ASC
                streaks.sort(key=lambda item: (-item[2], -item[1], item[0]))

                log.info("Deleting existing streak_ranks records")
                cur.execute("DELETE FROM streak_ranks")

                rows_to_insert = [
                    (rank, person_id, current, longest)
                    for rank, (person_id, current, longest) in enumerate(streaks, start=1)
                ]
                if rows_to_insert:
                    execute_values(
                        cur,
                        """
                        INSERT INTO streak_ranks
                        (rank, person_id, current_streak, longest_streak)
                        VALUES %s
                        """,
                        rows_to_insert,
                    )

                log.info("Inserted %s streak_ranks record(s)", len(rows_to_insert))

        log.info("Streak ranks updated successfully")
        return jsonify({"success": True, "message": "Streak ranks updated successfully"})
    except Exception as e:
        log.exception("Error updating streak ranks: %s", e)
        return jsonify({"success": False, "message": "Error updating streak ranks"}), 500


@admin_bp.route("/update-nemesis-stats", methods=["POST"])
@require_cron_auth
def update_nemesis_stats():
    try:
        log.info("Starting nemesis stats update")

        query = """
        SELECT person_id, 'single' AS slot_type, event_id, best
        FROM ranks_single WHERE best > 0
        UNION ALL
        SELECT person_id, 'average' AS slot_type, event_id, best
        FROM ranks_average WHERE best > 0
        """

        try:
            from social.nemesis import fetch_nemesis_free_ids

            with get_connection() as conn:
                with conn.cursor() as cur:
                    nemesis_free_before = fetch_nemesis_free_ids(cur)
        except Exception as e:
            log.warning("Could not snapshot nemesis-free competitors: %s", e)
            nemesis_free_before = None

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                entries = cur.fetchall()
                log.info("Fetched %s rank row(s) for nemesis stats", len(entries))

                rows_to_insert = compute_nemesis_stats(entries)

                log.info("Deleting existing nemesis_stats records")
                cur.execute("DELETE FROM nemesis_stats")

                if rows_to_insert:
                    execute_values(
                        cur,
                        """
                        INSERT INTO nemesis_stats
                        (person_id, nemesis_count, nemesized_count, event_count, slot_count)
                        VALUES %s
                        """,
                        rows_to_insert,
                    )

                log.info("Inserted %s nemesis_stats record(s)", len(rows_to_insert))

        if nemesis_free_before is not None:
            try:
                from social.nemesis import fetch_nemesis_free
                from social.poster import post_new_nemesis_free

                with get_connection() as conn:
                    with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                        nemesis_free_after = fetch_nemesis_free(cur)
                post_new_nemesis_free(nemesis_free_before, nemesis_free_after)
            except Exception as e:
                log.exception(
                    "Social NÉMESIS posting failed (nemesis stats update succeeded): %s",
                    e,
                )

        log.info("Nemesis stats updated successfully")
        return jsonify({"success": True, "message": "Nemesis stats updated successfully"})
    except Exception as e:
        log.exception("Error updating nemesis stats: %s", e)
        return jsonify({"success": False, "message": "Error updating nemesis stats"}), 500
