"""Derived rankings: sum of ranks, Kinch, PR streaks, nemesis stats."""

from psycopg.types.json import Jsonb

from common import (
    EVENT_SCOPES,
    KINCH_SKIPPED_EVENTS,
    SINGLE_EVENTS,
    events_subquery,
    execute_values,
    get_connection,
    job_response,
    log,
    named_row,
    require_cron_auth,
)
from nemesis_stats import compute_nemesis_stats
from routes.admin.blueprint import admin_bp


def _sum_of_ranks_query(ranks_table, scope):
    return f"""
        WITH all_events AS (
          SELECT DISTINCT event_id FROM {ranks_table}
          WHERE event_id IN {events_subquery(scope)}
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
              'countryRank', COALESCE(NULLIF(r.country_rank, 0), wr.worst_rank),
              'completed', CASE WHEN r.country_rank IS NULL OR r.country_rank = 0 THEN false ELSE true END
            )
          ) AS events,
          SUM(COALESCE(NULLIF(r.country_rank, 0), wr.worst_rank)) AS overall
        FROM people_events pe
        LEFT JOIN {ranks_table} r
            ON pe.wca_id = r.person_id AND pe.event_id = r.event_id
        LEFT JOIN (
          SELECT event_id, MAX(country_rank) + 1 AS worst_rank
          FROM {ranks_table}
          GROUP BY event_id
        ) AS wr
            ON wr.event_id = pe.event_id
        GROUP BY pe.wca_id, pe.name
        ORDER BY overall
        """


def _compute_sum_of_ranks(cur, result_type, scope):
    ranks_table = "ranks_single" if result_type == "single" else "ranks_average"
    log.info("Deleting existing sum_of_ranks records (%s, %s)", result_type, scope)
    cur.execute(
        "DELETE FROM sum_of_ranks WHERE result_type = %s AND scope = %s",
        (result_type, scope),
    )
    cur.execute(_sum_of_ranks_query(ranks_table, scope))
    persons = cur.fetchall()
    log.info("Fetched %s record(s) for %s results (%s)", len(persons), result_type, scope)
    rows_to_insert = [
        (rank, row.wca_id, result_type, scope, row.overall, Jsonb(row.events))
        for rank, row in enumerate(persons, start=1)
    ]
    if rows_to_insert:
        execute_values(
            cur,
            """
            INSERT INTO sum_of_ranks (rank, person_id, result_type, scope, overall, events)
            VALUES %s
            """,
            rows_to_insert,
        )


def run_update_sum_of_ranks():
    log.info("Starting sum of ranks update")
    for scope in EVENT_SCOPES:
        for result_type in ("single", "average"):
            with get_connection() as conn:
                with conn.cursor(row_factory=named_row) as cur:
                    _compute_sum_of_ranks(cur, result_type, scope)
    log.info("Sum of ranks updated successfully")
    return {"message": "Sum of ranks updated successfully"}


@admin_bp.route("/update-sum-of-ranks", methods=["POST"])
@require_cron_auth
def update_sum_of_ranks():
    return job_response(run_update_sum_of_ranks, "Error updating sum of ranks")


def _kinch_query(scope):
    single_events = ",".join(f"'{e}'" for e in SINGLE_EVENTS)
    skipped_events = ",".join(f"'{e}'" for e in KINCH_SKIPPED_EVENTS)
    scope_events = events_subquery(scope)
    return f"""
        WITH PersonalRecords AS (
          SELECT
            person_id,
            event_id,
            MIN(best) AS personal_best,
            'average' AS type
          FROM ranks_average
          WHERE event_id IN {scope_events}
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
          WHERE country_rank = 1 AND event_id IN {scope_events}
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
          SELECT id FROM events WHERE id IN {scope_events} AND id NOT IN ({skipped_events})
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


def _compute_kinch_ranks(cur, scope):
    log.info("Deleting existing kinch_ranks records (%s)", scope)
    cur.execute("DELETE FROM kinch_ranks WHERE scope = %s", (scope,))
    cur.execute(_kinch_query(scope))
    persons = cur.fetchall()
    log.info("Fetched %s record(s) for kinch ranks (%s)", len(persons), scope)
    rows_to_insert = [
        (rank, row.id, scope, row.overall, Jsonb(row.events)) for rank, row in enumerate(persons, start=1)
    ]
    if rows_to_insert:
        execute_values(
            cur,
            """
            INSERT INTO kinch_ranks (rank, person_id, scope, overall, events)
            VALUES %s
            """,
            rows_to_insert,
        )


def run_update_kinch_ranks():
    log.info("Starting kinch ranks update")
    for scope in EVENT_SCOPES:
        with get_connection() as conn:
            with conn.cursor(row_factory=named_row) as cur:
                _compute_kinch_ranks(cur, scope)
    log.info("Kinch ranks updated successfully")
    return {"message": "Kinch ranks updated successfully"}


@admin_bp.route("/update-kinch-ranks", methods=["POST"])
@require_cron_auth
def update_kinch_ranks():
    return job_response(run_update_kinch_ranks, "Error updating kinch ranks")


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


def _compute_streak_ranks(cur, scope):
    cur.execute(
        f"""
        SELECT r.person_id, r.competition_id, r.event_id, r.best, r.average
        FROM results r
        JOIN competitions c ON c.id = r.competition_id
        WHERE r.event_id IN {events_subquery(scope)}
        ORDER BY r.person_id, c.start_date ASC, r.competition_id ASC
        """
    )
    rows = cur.fetchall()
    log.info("Fetched %s result row(s) for streak ranks (%s)", len(rows), scope)

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

    log.info("Deleting existing streak_ranks records (%s)", scope)
    cur.execute("DELETE FROM streak_ranks WHERE scope = %s", (scope,))

    rows_to_insert = [
        (rank, person_id, scope, current, longest)
        for rank, (person_id, current, longest) in enumerate(streaks, start=1)
    ]
    if rows_to_insert:
        execute_values(
            cur,
            """
            INSERT INTO streak_ranks
            (rank, person_id, scope, current_streak, longest_streak)
            VALUES %s
            """,
            rows_to_insert,
        )

    log.info("Inserted %s streak_ranks record(s) (%s)", len(rows_to_insert), scope)


def run_update_streak_ranks():
    log.info("Starting streak ranks update")
    for scope in EVENT_SCOPES:
        with get_connection() as conn:
            with conn.cursor(row_factory=named_row) as cur:
                _compute_streak_ranks(cur, scope)
    log.info("Streak ranks updated successfully")
    return {"message": "Streak ranks updated successfully"}


@admin_bp.route("/update-streak-ranks", methods=["POST"])
@require_cron_auth
def update_streak_ranks():
    return job_response(run_update_streak_ranks, "Error updating streak ranks")


def _compute_nemesis_stats(cur, scope):
    scope_events = events_subquery(scope)
    cur.execute(
        f"""
        SELECT person_id, 'single' AS slot_type, event_id, best
        FROM ranks_single WHERE best > 0 AND event_id IN {scope_events}
        UNION ALL
        SELECT person_id, 'average' AS slot_type, event_id, best
        FROM ranks_average WHERE best > 0 AND event_id IN {scope_events}
        """
    )
    entries = cur.fetchall()
    log.info("Fetched %s rank row(s) for nemesis stats (%s)", len(entries), scope)

    rows_to_insert = [(row[0], scope, *row[1:]) for row in compute_nemesis_stats(entries)]

    log.info("Deleting existing nemesis_stats records (%s)", scope)
    cur.execute("DELETE FROM nemesis_stats WHERE scope = %s", (scope,))

    if rows_to_insert:
        execute_values(
            cur,
            """
            INSERT INTO nemesis_stats
            (person_id, scope, nemesis_count, nemesized_count, event_count, slot_count)
            VALUES %s
            """,
            rows_to_insert,
        )

    log.info("Inserted %s nemesis_stats record(s) (%s)", len(rows_to_insert), scope)


def run_update_nemesis_stats():
    log.info("Starting nemesis stats update")

    try:
        from social.nemesis import fetch_nemesis_free_ids

        with get_connection() as conn:
            with conn.cursor() as cur:
                nemesis_free_before = fetch_nemesis_free_ids(cur)
    except Exception as e:
        log.warning("Could not snapshot nemesis-free competitors: %s", e)
        nemesis_free_before = None

    for scope in EVENT_SCOPES:
        with get_connection() as conn:
            with conn.cursor() as cur:
                _compute_nemesis_stats(cur, scope)

    if nemesis_free_before is not None:
        try:
            from social.nemesis import fetch_nemesis_free
            from social.poster import post_new_nemesis_free

            with get_connection() as conn:
                with conn.cursor(row_factory=named_row) as cur:
                    nemesis_free_after = fetch_nemesis_free(cur)
            post_new_nemesis_free(nemesis_free_before, nemesis_free_after)
        except Exception as e:
            log.exception(
                "Social NÉMESIS posting failed (nemesis stats update succeeded): %s",
                e,
            )

    log.info("Nemesis stats updated successfully")
    return {"message": "Nemesis stats updated successfully"}


@admin_bp.route("/update-nemesis-stats", methods=["POST"])
@require_cron_auth
def update_nemesis_stats():
    return job_response(run_update_nemesis_stats, "Error updating nemesis stats")
