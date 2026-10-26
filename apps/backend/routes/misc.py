import psycopg2.extras
from flask import Blueprint, jsonify

from common import OFFICIAL_EVENTS_SUBQUERY, events_subquery, get_connection, log
from utils import (
    convert_keys_to_camel_case,
    parse_bool_query_param,
    parse_int_query_param_or_default,
    public_cache_headers,
)

misc_bp = Blueprint("misc", __name__)
misc_bp.after_request(public_cache_headers)


@misc_bp.route("/teams", methods=["GET"])
def get_teams():
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching all teams")
                cur.execute("SELECT * FROM teams")
                teams = cur.fetchall()
                teams_list = [convert_keys_to_camel_case(dict(team._asdict())) for team in teams]
                log.info("Fetched %s team(s)", len(teams_list))
        return jsonify(teams_list)
    except Exception as e:
        log.exception("Error fetching teams: %s", e)
        return jsonify({"success": False, "message": "Error fetching teams"}), 500


@misc_bp.route("/teams/<state_id>", methods=["GET"])
def get_team_by_id(state_id):
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching team with ID: %s", state_id)
                cur.execute("SELECT * FROM teams WHERE state_id = %s", (state_id,))
                team = cur.fetchone()
                if team:
                    team_data = convert_keys_to_camel_case(dict(team._asdict()))
                    log.info("Fetched team: %s", team_data)
                    return jsonify(team_data)
                log.warning("No team found with ID: %s", state_id)
                return jsonify({"success": False, "message": "Team not found"}), 404
    except Exception as e:
        log.exception("Error fetching team by ID: %s", e)
        return jsonify({"success": False, "message": "Error fetching team"}), 500


@misc_bp.route("/states", methods=["GET"])
def get_states():
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching all states")
                cur.execute("SELECT * FROM states")
                states = cur.fetchall()
                states_list = [dict(state._asdict()) for state in states]
                log.info("Fetched %s state(s)", len(states_list))
        return jsonify(states_list)
    except Exception as e:
        log.exception("Error fetching states: %s", e)
        return jsonify({"success": False, "message": "Error fetching states"}), 500


RANK_TABLES = {"single": "ranks_single", "average": "ranks_average"}
MAX_RANK_PAGE_SIZE = 1000


def _rank_query_params():
    """(scope, page, size) from the query string. Raises ValueError on an invalid `deprecated`."""
    scope = "all" if parse_bool_query_param("deprecated") else "official"
    page = parse_int_query_param_or_default("page", 1, min_value=1)
    size = parse_int_query_param_or_default("size", MAX_RANK_PAGE_SIZE, min_value=1, max_value=MAX_RANK_PAGE_SIZE)
    return scope, page, size


def _event_in_scope(cur, event_id, scope):
    cur.execute(f"SELECT 1 FROM events WHERE id = %s AND id IN {events_subquery(scope)}", (event_id,))
    return cur.fetchone() is not None


def _rank_entry(rank, rank_type, with_state):
    entry = {
        "rankType": rank_type,
        "personId": rank.person_id,
        "personName": rank.name,
        "eventId": rank.event_id,
        "best": rank.best,
        "rank": {
            "world": rank.world_rank,
            "continent": rank.continent_rank,
            "country": rank.country_rank,
            "state": rank.state_rank,
        },
    }
    if with_state:
        entry["stateId"] = rank.state_id
    return entry


def _ranks_response(cur, *, where, params, order_by, rank_type, page, size, with_state):
    table_name = RANK_TABLES[rank_type]
    from_clause = f"FROM {table_name} rs INNER JOIN persons p ON rs.person_id = p.wca_id WHERE {where}"

    cur.execute(f"SELECT COUNT(*) AS total {from_clause}", params)
    total = cur.fetchone().total
    if total == 0:
        return jsonify({"success": False, "message": "Ranks not found"}), 404

    cur.execute(
        f"""
        SELECT rs.person_id, p.name, p.state_id, rs.event_id, rs.best,
               rs.world_rank, rs.continent_rank, rs.country_rank, rs.state_rank
        {from_clause}
        ORDER BY {order_by}
        LIMIT %s OFFSET %s
        """,
        (*params, size, (page - 1) * size),
    )
    response = jsonify([_rank_entry(rank, rank_type, with_state) for rank in cur.fetchall()])
    response.headers["X-Total-Count"] = str(total)
    return response


@misc_bp.route("/rank/<type>/<event_id>", methods=["GET"])
def get_national_rank(type, event_id):
    if type not in RANK_TABLES:
        return jsonify({"success": False, "message": "type must be single or average"}), 400
    try:
        scope, page, size = _rank_query_params()
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching national ranks for type: %s, event: %s", type, event_id)
                if not _event_in_scope(cur, event_id, scope):
                    return jsonify({"success": False, "message": "Event not found"}), 404
                return _ranks_response(
                    cur,
                    where="rs.event_id = %s AND rs.country_rank <> 0",
                    params=(event_id,),
                    order_by="rs.country_rank ASC, rs.person_id ASC",
                    rank_type=type,
                    page=page,
                    size=size,
                    with_state=True,
                )
    except Exception as e:
        log.exception("Error fetching national ranks: %s", e)
        return jsonify({"success": False, "message": "Error fetching ranks"}), 500


@misc_bp.route("/rank/<state_id>/<type>/<event_id>", methods=["GET"])
def get_rank(state_id, type, event_id):
    if type not in RANK_TABLES:
        return jsonify({"success": False, "message": "type must be single or average"}), 400
    try:
        scope, page, size = _rank_query_params()
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching ranks for state: %s, type: %s, event: %s", state_id, type, event_id)
                cur.execute("SELECT 1 FROM states WHERE id = %s", (state_id,))
                if cur.fetchone() is None:
                    return jsonify({"success": False, "message": "State not found"}), 404
                if not _event_in_scope(cur, event_id, scope):
                    return jsonify({"success": False, "message": "Event not found"}), 404
                return _ranks_response(
                    cur,
                    where="p.state_id = %s AND rs.event_id = %s",
                    params=(state_id, event_id),
                    order_by="rs.state_rank ASC NULLS LAST, rs.country_rank ASC, rs.person_id ASC",
                    rank_type=type,
                    page=page,
                    size=size,
                    with_state=False,
                )
    except Exception as e:
        log.exception("Error fetching ranks: %s", e)
        return jsonify({"success": False, "message": "Error fetching ranks"}), 500


@misc_bp.route("/records/<state_id>", methods=["GET"])
def get_records(state_id):
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                log.info("Fetching records for state: %s", state_id)

                single_query = f"""
                    SELECT
                        rs.person_id,
                        rs.event_id,
                        rs.best,
                        rs.world_rank,
                        rs.continent_rank,
                        rs.country_rank,
                        rs.state_rank,
                        p.name as person_name,
                        e.name as event_name
                    FROM ranks_single rs
                    INNER JOIN persons p ON rs.person_id = p.wca_id
                    INNER JOIN events e ON rs.event_id = e.id
                    WHERE p.state_id = %s
                    AND rs.state_rank = 1
                    AND rs.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
                    ORDER BY e.rank
                """

                average_query = f"""
                    SELECT
                        ra.person_id,
                        ra.event_id,
                        ra.best,
                        ra.world_rank,
                        ra.continent_rank,
                        ra.country_rank,
                        ra.state_rank,
                        p.name as person_name,
                        e.name as event_name
                    FROM ranks_average ra
                    INNER JOIN persons p ON ra.person_id = p.wca_id
                    INNER JOIN events e ON ra.event_id = e.id
                    WHERE p.state_id = %s
                    AND ra.state_rank = 1
                    AND ra.event_id IN {OFFICIAL_EVENTS_SUBQUERY}
                    ORDER BY e.rank
                """

                query_params = [state_id]

                cur.execute(single_query, query_params)
                single_records = cur.fetchall()

                cur.execute(average_query, query_params)
                average_records = cur.fetchall()

                records_data = {
                    "single": [
                        {
                            "personId": record.person_id,
                            "personName": record.person_name,
                            "eventId": record.event_id,
                            "eventName": record.event_name,
                            "best": record.best,
                            "rank": {
                                "world": record.world_rank,
                                "continent": record.continent_rank,
                                "country": record.country_rank,
                                "state": record.state_rank,
                            },
                        }
                        for record in single_records
                    ],
                    "average": [
                        {
                            "personId": record.person_id,
                            "personName": record.person_name,
                            "eventId": record.event_id,
                            "eventName": record.event_name,
                            "best": record.best,
                            "rank": {
                                "world": record.world_rank,
                                "continent": record.continent_rank,
                                "country": record.country_rank,
                                "state": record.state_rank,
                            },
                        }
                        for record in average_records
                    ],
                }

                log.info(
                    "Fetched %s single records and %s average records for state: %s",
                    len(single_records),
                    len(average_records),
                    state_id,
                )
                return jsonify(records_data)

    except Exception as e:
        log.exception("Error fetching records: %s", e)
        return jsonify({"success": False, "message": "Error fetching records"}), 500
