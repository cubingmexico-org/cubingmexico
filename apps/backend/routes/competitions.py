import requests
from flask import Blueprint, jsonify

from common import cursor, log
from utils import (
    build_competitions_filter_query_parts,
    convert_keys_to_camel_case,
    parse_int_query_param_or_default,
    public_cache_headers,
)

competitions_bp = Blueprint("competitions", __name__)
competitions_bp.after_request(public_cache_headers)

# Competitor states come from the live WCIF, so they go stale faster than the nightly data.
COMPETITOR_STATES_MAX_AGE = 300


@competitions_bp.route("/competitions", methods=["GET"])
def get_competitions():
    try:
        page = parse_int_query_param_or_default("page", 1, min_value=1)
        size = parse_int_query_param_or_default("size", 100, min_value=1, max_value=100)
        where_clauses, query_params = build_competitions_filter_query_parts()
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400

    offset = (page - 1) * size
    where_sql = " AND ".join(where_clauses)

    with cursor() as cur:
        cur.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM competitions c
            WHERE {where_sql}
            """,
            tuple(query_params),
        )
        count_row = cur.fetchone()
        total = count_row.total if count_row else 0

        cur.execute(
            f"""
            SELECT c.*, s.name AS state_name
            FROM competitions c
            LEFT JOIN states s ON s.id = c.state_id
            WHERE {where_sql}
            ORDER BY c.start_date DESC, c.id DESC
            LIMIT %s OFFSET %s
            """,
            (*query_params, size, offset),
        )
        competitions = cur.fetchall()

    items = [convert_keys_to_camel_case(dict(competition._asdict())) for competition in competitions]

    log.info(
        "Fetched %s competition(s) for page=%s size=%s with total=%s",
        len(items),
        page,
        size,
        total,
    )

    return jsonify({"pagination": {"page": page, "size": size}, "total": total, "items": items})


@competitions_bp.route("/competitions/<competition_id>", methods=["GET"])
def get_competition_by_id(competition_id):
    with cursor() as cur:
        cur.execute(
            """
            SELECT c.*, s.name AS state_name
            FROM competitions c
            LEFT JOIN states s ON s.id = c.state_id
            WHERE c.id = %s AND c.country_id = %s
            """,
            (competition_id, "Mexico"),
        )
        competition = cur.fetchone()

        if not competition:
            return jsonify({"success": False, "message": "Competition not available for Mexico"})

        cur.execute(
            """
            SELECT ce.event_id, e.name AS event_name
            FROM competition_events ce
            LEFT JOIN events e ON e.id = ce.event_id
            WHERE ce.competition_id = %s
            ORDER BY e.rank NULLS LAST, ce.event_id
            """,
            (competition_id,),
        )
        event_rows = cur.fetchall()

        cur.execute(
            """
            SELECT
                co.organizer_id AS id,
                o.person_id,
                o.status,
                p.name AS person_name
            FROM competition_organizers co
            LEFT JOIN organizers o ON o.id = co.organizer_id
            LEFT JOIN persons p ON p.wca_id = o.person_id
            WHERE co.competition_id = %s
            ORDER BY co.organizer_id
            """,
            (competition_id,),
        )
        organizer_rows = cur.fetchall()

        cur.execute(
            """
            SELECT
                cd.delegate_id AS id,
                d.person_id,
                d.status,
                p.name AS person_name
            FROM competition_delegates cd
            LEFT JOIN delegates d ON d.id = cd.delegate_id
            LEFT JOIN persons p ON p.wca_id = d.person_id
            WHERE cd.competition_id = %s
            ORDER BY cd.delegate_id
            """,
            (competition_id,),
        )
        delegate_rows = cur.fetchall()

        cur.execute(
            """
            SELECT id, championship_type
            FROM championships
            WHERE competition_id = %s
            ORDER BY id
            """,
            (competition_id,),
        )
        championship_rows = cur.fetchall()

    competition_data = convert_keys_to_camel_case(dict(competition._asdict()))
    competition_data["events"] = [convert_keys_to_camel_case(dict(event._asdict())) for event in event_rows]
    competition_data["organizers"] = [
        convert_keys_to_camel_case(dict(organizer._asdict())) for organizer in organizer_rows
    ]
    competition_data["delegates"] = [convert_keys_to_camel_case(dict(delegate._asdict())) for delegate in delegate_rows]
    competition_data["championships"] = [
        convert_keys_to_camel_case(dict(championship._asdict())) for championship in championship_rows
    ]

    return jsonify(competition_data)


def _competitor_states_response(data):
    response = jsonify(data)
    response.headers["Cache-Control"] = f"public, max-age={COMPETITOR_STATES_MAX_AGE}"
    return response


@competitions_bp.route("/competitor-states/<competition_id>", methods=["GET"])
def get_competitor_states(competition_id):
    wcif_url = f"https://www.worldcubeassociation.org/api/v0/competitions/{competition_id}/wcif/latest"
    log.info("Fetching WCIF data from %s", wcif_url)
    try:
        response = requests.get(wcif_url, timeout=30)
        response.raise_for_status()
        wcif_data = response.json()
    except requests.RequestException as e:
        log.exception("Error fetching WCIF data: %s", e)
        return jsonify({"success": False, "message": f"Error fetching competition data: {e}"}), 500

    wca_ids = [person.get("wcaId") for person in wcif_data.get("persons", []) if person.get("wcaId") is not None]
    if not wca_ids:
        log.warning("No WCA IDs found for competition: %s", competition_id)
        return _competitor_states_response([])
    log.info("Found %s competitors with WCA IDs", len(wca_ids))

    with cursor() as cur:
        cur.execute(
            "SELECT wca_id, state_id FROM persons WHERE wca_id = ANY(%s)",
            (wca_ids,),
        )
        competitors_data = [convert_keys_to_camel_case(dict(competitor._asdict())) for competitor in cur.fetchall()]
    log.info("Fetched state data for %s competitor(s)", len(competitors_data))

    return _competitor_states_response(competitors_data)
