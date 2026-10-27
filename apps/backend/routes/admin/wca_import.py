"""WCA results export import and Mexican competition sync."""

import io
import json
import zipfile
from datetime import datetime

import requests
from flask import jsonify

from common import get_connection, job_response, log, named_row, require_cron_auth
from routes.admin.blueprint import admin_bp
from utils import extract_first_image_url

# The import steps (wca_import_competitions, _results, _tables) need pandas, which takes about a
# third of the app's startup and nothing else uses, so they're imported only when an import runs.

# (connect, read) seconds; read is per-chunk inactivity, not total download time.
WCA_EXPORT_TIMEOUT = (30, 300)
# Shown in the site footer, as the WCA asks of sites using its export.
WCA_EXPORT_DATE_KEY = "wca_export_date"


def parse_wca_export_date(raw):
    """`export_date` from the export's metadata.json, or None."""
    try:
        value = json.loads(raw).get("export_date")
    except (ValueError, AttributeError):
        return None
    return str(value) if value else None


def store_wca_export_date(raw):
    export_date = parse_wca_export_date(raw)
    if not export_date:
        log.warning("WCA export metadata.json has no export_date")
        return
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO export_metadata (key, value, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value,
                    updated_at = EXCLUDED.updated_at
                """,
                (WCA_EXPORT_DATE_KEY, export_date),
            )


WCA_EXPORT_URL = "https://www.worldcubeassociation.org/export/results/v2/tsv"


def process_wca_export(z):
    """Imports every file of an opened WCA export zip, in dependency order."""
    from routes.admin.wca_import_competitions import import_championships, import_competitions
    from routes.admin.wca_import_results import import_result_attempts, import_results
    from routes.admin.wca_import_tables import (
        import_events,
        import_formats,
        import_persons,
        import_ranks_average,
        import_ranks_single,
        import_round_types,
    )

    # Results must come after persons and competitions, and attempts after results.
    steps = [
        ("WCA_export_events.tsv", import_events),
        ("WCA_export_formats.tsv", import_formats),
        ("WCA_export_round_types.tsv", import_round_types),
        ("WCA_export_persons.tsv", import_persons),
        ("WCA_export_competitions.tsv", import_competitions),
        ("WCA_export_championships.tsv", import_championships),
        ("WCA_export_ranks_single.tsv", import_ranks_single),
        ("WCA_export_ranks_average.tsv", import_ranks_average),
        ("WCA_export_results.tsv", import_results),
        ("WCA_export_result_attempts.tsv", import_result_attempts),
    ]

    results_updated = False
    available_files = set(z.namelist())

    for file_name, import_step in steps:
        if file_name not in available_files:
            log.warning("Expected file %s not found in zip archive. Skipping.", file_name)
            continue
        if import_step is import_result_attempts and not results_updated:
            log.info("Results table update was skipped. Skipping result attempts as well.")
            continue
        outcome = import_step(z, file_name)
        if import_step is import_results and outcome:
            results_updated = True

    if "metadata.json" in available_files:
        store_wca_export_date(z.read("metadata.json"))

    return {"resultsUpdated": results_updated}


def run_update_full_database():
    log.info("Fetching data from %s", WCA_EXPORT_URL)
    response = requests.get(WCA_EXPORT_URL, timeout=WCA_EXPORT_TIMEOUT)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content), "r") as z:
        result = process_wca_export(z)

    try:
        from social.poster import post_summary_unlock_if_due

        post_summary_unlock_if_due()
    except Exception as e:
        log.exception(
            "Social SUMMARY_UNLOCK posting failed (database import succeeded): %s",
            e,
        )

    log.info("Database updated successfully")
    return {"message": "Database updated successfully", **result}


@admin_bp.route("/update-database", methods=["POST"])
@require_cron_auth
def update_full_database():
    return job_response(run_update_full_database, "Error updating database")


@admin_bp.route("/update-existing-mexican-competitions", methods=["POST"])
@require_cron_auth
def update_existing_mexican_competitions():
    import pandas as pd

    from routes.admin.wca_import_competitions import sync_mexican_competition_staff

    url = WCA_EXPORT_URL
    competitions_file = "WCA_export_competitions.tsv"

    def normalize_value(value):
        return None if pd.isna(value) else value

    try:
        log.info("Fetching data from %s", url)
        response = requests.get(url, timeout=WCA_EXPORT_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        log.exception("Failed to fetch zip file from %s: %s", url, e)
        return jsonify({"success": False, "message": f"Failed to fetch zip file: {e}"}), 500

    try:
        with zipfile.ZipFile(io.BytesIO(response.content), "r") as z:
            if competitions_file not in z.namelist():
                log.error("Expected file %s not found in zip archive", competitions_file)
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Expected file {competitions_file} not found in export zip",
                        }
                    ),
                    500,
                )

            file_content = z.read(competitions_file).decode("utf-8")
            cleaned_content = file_content.replace('"', "")
            df = pd.read_csv(io.StringIO(cleaned_content), delimiter="\t", na_values=["NULL"])
            competitions = df.to_dict(orient="records")
    except (zipfile.BadZipFile, KeyError, UnicodeDecodeError, pd.errors.ParserError) as e:
        log.error("Failed to parse %s from export zip: %s", competitions_file, e)
        return jsonify({"success": False, "message": f"Failed to parse competitions file: {e}"}), 500

    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=named_row) as cur:
                cur.execute("SELECT id FROM competitions WHERE country_id = 'Mexico'")
                existing_mexican_competitions = {row.id for row in cur.fetchall()}

                cur.execute("SELECT id FROM organizers")
                organizer_ids = {row.id for row in cur.fetchall()}

                cur.execute("SELECT id FROM delegates")
                delegate_ids = {row.id for row in cur.fetchall()}

                updated_count = 0
                for row in competitions:
                    competition_id = row.get("id")
                    if row.get("country_id") != "Mexico" or competition_id not in existing_mexican_competitions:
                        continue

                    latitude = normalize_value(row.get("latitude_microdegrees"))
                    longitude = normalize_value(row.get("longitude_microdegrees"))
                    information = normalize_value(row.get("information"))
                    extracted_logo = extract_first_image_url(information)

                    start_date = datetime(
                        int(row["year"]),
                        int(row["month"]),
                        int(row["day"]),
                    )
                    end_date = datetime(
                        int(row["year"]),
                        int(row["end_month"]),
                        int(row["end_day"]),
                    )

                    cur.execute(
                        """
                        UPDATE competitions
                        SET name = %(name)s,
                            city_name = %(city_name)s,
                            country_id = %(country_id)s,
                            information = %(information)s,
                            start_date = %(start_date)s,
                            end_date = %(end_date)s,
                            cancelled = %(cancelled)s,
                            venue = %(venue)s,
                            venue_address = %(venue_address)s,
                            venue_details = %(venue_details)s,
                            external_website = %(external_website)s,
                            cell_name = %(cell_name)s,
                            latitude_microdegrees = %(latitude_microdegrees)s,
                            longitude_microdegrees = %(longitude_microdegrees)s,
                            logo = COALESCE(logo, %(extracted_logo)s)
                        WHERE id = %(id)s AND country_id = 'Mexico'
                        """,
                        {
                            "id": competition_id,
                            "name": normalize_value(row.get("name")),
                            "city_name": normalize_value(row.get("city_name")),
                            "country_id": normalize_value(row.get("country_id")),
                            "information": information,
                            "start_date": start_date,
                            "end_date": end_date,
                            "cancelled": bool(normalize_value(row.get("cancelled"))),
                            "venue": normalize_value(row.get("venue")),
                            "venue_address": normalize_value(row.get("venue_address")),
                            "venue_details": normalize_value(row.get("venue_details")),
                            "external_website": normalize_value(row.get("external_website")),
                            "cell_name": normalize_value(row.get("cell_name")),
                            "latitude_microdegrees": latitude,
                            "longitude_microdegrees": longitude,
                            "extracted_logo": extracted_logo,
                        },
                    )

                    if cur.rowcount > 0:
                        updated_count += 1

                    sync_mexican_competition_staff(
                        cur,
                        competition_id,
                        row.get("organizers"),
                        row.get("delegates"),
                        organizer_ids,
                        delegate_ids,
                    )

        log.info("Updated %s existing Mexican competitions", updated_count)
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Existing Mexican competitions updated successfully",
                    "updated_competitions": updated_count,
                }
            ),
            200,
        )
    except Exception as e:
        log.exception("Error updating existing Mexican competitions: %s", e)
        return jsonify({"success": False, "message": "Error updating existing Mexican competitions"}), 500
