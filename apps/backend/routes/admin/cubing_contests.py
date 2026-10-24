"""Cubing Contests export import: unofficial events held at WCA competitions.

Only results from `wca-comp` contests are kept, either held in Mexico or with at
least one Mexican competitor. They live in the `cc_*` tables and never take part
in the official/all event scopes.
"""

import csv
import io
import json
import zipfile
from datetime import datetime

import psycopg2.extras
import requests
from flask import jsonify, request
from psycopg2.extras import execute_values

from common import OFFICIAL_EVENTS_SUBQUERY, get_connection, log, require_cron_auth
from routes.admin.blueprint import admin_bp

CC_EXPORT_URL = "https://cubingcontests.com/api/default/export/v1/csv"
CC_EXPORT_TIMEOUT = (30, 300)
CC_METADATA_KEY = "cubing_contests_export_date"
CC_EMPTY_STRING = "__EMPTY_STRING__"
CC_FILES = {
    "contests": "export_contests.csv",
    "persons": "export_persons.csv",
    "events": "export_events.csv",
    "rounds": "export_rounds.csv",
    "results": "export_results.csv",
}
CC_EVENT_FORMATS = ("time", "number", "multi")
# Cubing Contests' "WCA" category: the current official WCA events.
CC_WCA_CATEGORY_ID = "5"


def read_cc_csv(text):
    """Parse one export CSV into dicts, turning the export's empty-string marker into ''."""
    return [
        {key: ("" if value == CC_EMPTY_STRING else value) for key, value in row.items()}
        for row in csv.DictReader(io.StringIO(text))
    ]


def _parse_date(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


def _int_or_none(value):
    return int(value) if value not in (None, "") else None


def candidate_competition_ids(contests):
    return {c["competition_id"] for c in contests if c["type"] == "wca-comp" and c["state"] == "published"}


def select_cc_rows(contests, persons, events, rounds, results, competition_ids, official_event_ids):
    """Pick the results to import and the events and persons they reference.

    `competition_ids` are the WCA competitions present in our `competitions` table;
    Official WCA events are never imported: CC events in its WCA category are
    dropped, and so are CC events sharing an id with `official_event_ids`
    (WCA events with rank < 800).
    """
    contests_by_id = {c["competition_id"]: c for c in contests if c["type"] == "wca-comp" and c["state"] == "published"}
    persons_by_id = {int(p["id"]): p for p in persons}
    events_by_id = {e["event_id"]: e for e in events}
    rounds_by_id = {r["id"]: r for r in rounds}

    kept_results = []
    kept_result_persons = []
    used_event_ids = set()
    used_person_ids = set()
    skipped_missing_competition = 0

    for row in results:
        contest = contests_by_id.get(row["competition_id"])
        if contest is None or row["approved"].upper() != "TRUE":
            continue
        event = events_by_id.get(row["event_id"])
        if event is None or event.get("category_id") == CC_WCA_CATEGORY_ID or row["event_id"] in official_event_ids:
            continue
        person_ids = [int(pid) for pid in json.loads(row["person_ids"] or "[]")]
        if not person_ids or any(pid not in persons_by_id for pid in person_ids):
            continue
        is_mexican = contest["region_code"] == "MX" or any(
            persons_by_id[pid]["region_code"] == "MX" for pid in person_ids
        )
        if not is_mexican:
            continue
        if row["competition_id"] not in competition_ids:
            skipped_missing_competition += 1
            continue

        round_row = rounds_by_id.get(row["round_id"])
        attempts = [int(a["result"]) for a in json.loads(row["attempts"] or "[]")]
        result_id = int(row["id"])
        kept_results.append(
            (
                result_id,
                row["competition_id"],
                row["event_id"],
                round_row["round_type_id"] if round_row else None,
                int(round_row["round_number"]) if round_row else 1,
                round_row["format"] if round_row else event["default_round_format"],
                _int_or_none(row["ranking"]),
                int(row["best"]),
                int(row["average"]),
                attempts,
                _parse_date(row["date"]),
            )
        )
        for position, pid in enumerate(person_ids):
            kept_result_persons.append((result_id, pid, position))
        used_event_ids.add(row["event_id"])
        used_person_ids.update(person_ids)

    kept_events = [
        (
            event_id,
            events_by_id[event_id]["name"][:64],
            events_by_id[event_id]["format"] if events_by_id[event_id]["format"] in CC_EVENT_FORMATS else "time",
            int(events_by_id[event_id]["rank"] or 0),
            int(events_by_id[event_id]["participants"] or 1),
        )
        for event_id in sorted(used_event_ids)
    ]
    kept_persons = [
        (
            pid,
            persons_by_id[pid]["name"][:80],
            persons_by_id[pid]["region_code"] or None,
            persons_by_id[pid]["wca_id"] or None,
        )
        for pid in sorted(used_person_ids)
    ]

    return {
        "events": kept_events,
        "persons": kept_persons,
        "results": kept_results,
        "result_persons": kept_result_persons,
        "skipped_missing_competition": skipped_missing_competition,
    }


def _fetch_export_metadata():
    response = requests.get(CC_EXPORT_URL, params={"metadataOnly": "true"}, timeout=(10, 30))
    response.raise_for_status()
    data = response.json()
    return data["exportDate"], data["publicUrl"]


def _read_export_zip(url):
    response = requests.get(url, timeout=CC_EXPORT_TIMEOUT)
    response.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(response.content), "r") as z:
        return {key: read_cc_csv(z.read(name).decode("utf-8")) for key, name in CC_FILES.items()}


def _replace_cc_tables(cur, rows):
    cur.execute("DELETE FROM cc_result_persons")
    cur.execute("DELETE FROM cc_results")
    cur.execute("DELETE FROM cc_persons")
    cur.execute("DELETE FROM cc_events")
    if rows["events"]:
        execute_values(
            cur,
            "INSERT INTO cc_events (id, name, format, rank, participants) VALUES %s",
            rows["events"],
        )
    if rows["persons"]:
        execute_values(
            cur,
            "INSERT INTO cc_persons (id, name, region_code, wca_id) VALUES %s",
            rows["persons"],
        )
    if rows["results"]:
        execute_values(
            cur,
            """
            INSERT INTO cc_results
            (id, competition_id, event_id, round_type_id, round_number, format_id,
             pos, best, average, attempts, date)
            VALUES %s
            """,
            rows["results"],
        )
    if rows["result_persons"]:
        execute_values(
            cur,
            "INSERT INTO cc_result_persons (result_id, person_id, position) VALUES %s",
            rows["result_persons"],
        )


def run_update_cubing_contests(force=False):
    """Returns (payload, status_code)."""
    try:
        export_date, public_url = _fetch_export_metadata()
    except (requests.RequestException, KeyError, ValueError) as e:
        log.exception("Failed to fetch Cubing Contests export metadata")
        return {"success": False, "message": f"Failed to fetch export metadata: {e}"}, 500

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            cur.execute("SELECT value FROM export_metadata WHERE key = %s", (CC_METADATA_KEY,))
            stored = cur.fetchone()
    if not force and stored and stored.value == export_date:
        log.info("Cubing Contests export %s already imported. Skipping.", export_date)
        return {"success": True, "message": "Export already imported", "export_date": export_date}, 200

    try:
        log.info("Fetching Cubing Contests export from %s", public_url)
        data = _read_export_zip(public_url)
    except (requests.RequestException, zipfile.BadZipFile, KeyError, UnicodeDecodeError) as e:
        log.exception("Failed to download or read the Cubing Contests export")
        return {"success": False, "message": f"Failed to read export: {e}"}, 500

    candidates = list(candidate_competition_ids(data["contests"]))
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            cur.execute("SELECT id FROM competitions WHERE id = ANY(%s)", (candidates,))
            competition_ids = {row.id for row in cur.fetchall()}
            cur.execute(f"SELECT id FROM events WHERE id IN {OFFICIAL_EVENTS_SUBQUERY}")
            official_event_ids = {row.id for row in cur.fetchall()}

            rows = select_cc_rows(
                data["contests"],
                data["persons"],
                data["events"],
                data["rounds"],
                data["results"],
                competition_ids,
                official_event_ids,
            )
            _replace_cc_tables(cur, rows)

            # A partial import (WCA export behind CC) must not mark the export as done.
            stored_value = export_date if rows["skipped_missing_competition"] == 0 else f"{export_date}:partial"
            cur.execute(
                """
                INSERT INTO export_metadata (key, value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value,
                    updated_at = EXCLUDED.updated_at
                """,
                (CC_METADATA_KEY, stored_value),
            )

    summary = {
        "success": True,
        "message": "Cubing Contests results imported",
        "export_date": export_date,
        "results": len(rows["results"]),
        "persons": len(rows["persons"]),
        "events": len(rows["events"]),
        "skipped_missing_competition": rows["skipped_missing_competition"],
    }
    log.info("Cubing Contests import: %s", summary)
    return summary, 200


@admin_bp.route("/update-cubing-contests", methods=["POST"])
@require_cron_auth
def update_cubing_contests():
    force = request.args.get("force", "").lower() in ("1", "true", "yes")
    try:
        payload, status = run_update_cubing_contests(force=force)
    except Exception:
        log.exception("Error importing Cubing Contests results")
        return jsonify({"success": False, "message": "Error importing Cubing Contests results"}), 500
    return jsonify(payload), status
