"""WCA results export import and Mexican competition sync."""

import io
import zipfile
from datetime import datetime

import pandas as pd
import psycopg2
import psycopg2.extras
import requests
from flask import jsonify

from common import get_connection, log, require_cron_auth
from routes.admin.blueprint import admin_bp
from routes.admin.wca_import_steps import (
    import_championships,
    import_competitions,
    import_events,
    import_formats,
    import_persons,
    import_ranks_average,
    import_ranks_single,
    import_result_attempts,
    import_results,
    import_round_types,
    sync_mexican_competition_staff,
)
from utils import extract_first_image_url

# (connect, read) seconds; read is per-chunk inactivity, not total download time.
WCA_EXPORT_TIMEOUT = (30, 300)


@admin_bp.route("/update-database", methods=["POST"])
@require_cron_auth
def update_full_database():
    url = "https://www.worldcubeassociation.org/export/results/v2/tsv"
    try:
        log.info("Fetching data from %s", url)
        response = requests.get(url, timeout=WCA_EXPORT_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as e:
        log.exception("Failed to fetch zip file from %s", url)
        return jsonify({"error": f"Failed to fetch zip file: {e}"}), 500

    zip_bytes = io.BytesIO(response.content)
    try:
        with zipfile.ZipFile(zip_bytes, "r") as z:
            results_updated = False
            file_processing_order = [
                "WCA_export_events.tsv",
                "WCA_export_formats.tsv",
                "WCA_export_round_types.tsv",
                "WCA_export_persons.tsv",
                "WCA_export_competitions.tsv",
                "WCA_export_championships.tsv",
                "WCA_export_ranks_single.tsv",
                "WCA_export_ranks_average.tsv",
                "WCA_export_results.tsv",
                "WCA_export_result_attempts.tsv",
            ]

            available_files = set(z.namelist())

            for file_name in file_processing_order:
                if file_name not in available_files:
                    log.warning("Expected file %s not found in zip archive. Skipping.", file_name)
                    continue
                if file_name == "WCA_export_competitions.tsv":
                    import_competitions(z, file_name)
                elif file_name == "WCA_export_championships.tsv":
                    import_championships(z, file_name)
                elif file_name == "WCA_export_events.tsv":
                    import_events(z, file_name)
                elif file_name == "WCA_export_round_types.tsv":
                    import_round_types(z, file_name)
                elif file_name == "WCA_export_formats.tsv":
                    import_formats(z, file_name)
                elif file_name == "WCA_export_persons.tsv":
                    import_persons(z, file_name)
                elif file_name == "WCA_export_ranks_average.tsv":
                    import_ranks_average(z, file_name)
                elif file_name == "WCA_export_ranks_single.tsv":
                    import_ranks_single(z, file_name)
                elif file_name == "WCA_export_results.tsv":
                    if import_results(z, file_name):
                        results_updated = True
                elif file_name == "WCA_export_result_attempts.tsv":
                    if not results_updated:
                        log.info("Results table update was skipped. Skipping result attempts as well.")
                        continue
                    import_result_attempts(z, file_name)

        try:
            from social.poster import post_summary_unlock_if_due

            post_summary_unlock_if_due()
        except Exception as e:
            log.exception(
                "Social SUMMARY_UNLOCK posting failed (database import succeeded): %s",
                e,
            )

        log.info("Database updated successfully")
        return jsonify({"success": True, "message": "Database updated successfully"})
    except Exception:
        log.exception("Error updating database")
        return jsonify({"success": False, "message": "Error updating database"}), 500


@admin_bp.route("/update-existing-mexican-competitions", methods=["POST"])
@require_cron_auth
def update_existing_mexican_competitions():
    url = "https://www.worldcubeassociation.org/export/results/v2/tsv"
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
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
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
