"""WCA results export import and Mexican competition sync."""

import io
import re
import zipfile
from datetime import datetime

import pandas as pd
import psycopg2
import psycopg2.extras
import requests
from flask import jsonify
from psycopg2.extras import execute_values

from common import get_connection, log, require_cron_auth
from routes.admin.blueprint import admin_bp
from routes.admin.schedules import run_update_competition_schedules
from utils import extract_first_image_url, get_state_from_coordinates

# (connect, read) seconds; read is per-chunk inactivity, not total download time.
WCA_EXPORT_TIMEOUT = (30, 300)

WCA_STAFF_PATTERN = re.compile(r"\{([^}]+)\}\{mailto:([^}]+)\}")


def parse_wca_staff(raw):
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return []
    return [(match.group(1), match.group(2)) for match in WCA_STAFF_PATTERN.finditer(str(raw))]


def sync_mexican_competition_staff(cur, competition_id, organizers_raw, delegates_raw, organizer_ids, delegate_ids):
    """Upsert staff from the WCA export and drop competition links no longer listed."""
    desired_organizer_ids = []
    for organizer_name, organizer_email in parse_wca_staff(organizers_raw):
        desired_organizer_ids.append(organizer_email)
        if organizer_email not in organizer_ids:
            cur.execute(
                "SELECT wca_id FROM persons WHERE name = %s",
                (organizer_name,),
            )
            person_res = cur.fetchone()
            person_id = person_res.wca_id if person_res else None
            cur.execute(
                """
                INSERT INTO organizers (id, person_id, status)
                VALUES (%(id)s, %(person_id)s, 'active')
                ON CONFLICT DO NOTHING
                """,
                {"id": organizer_email, "person_id": person_id},
            )
            organizer_ids.add(organizer_email)
        cur.execute(
            """
            INSERT INTO competition_organizers (competition_id, organizer_id)
            VALUES (%(competition_id)s, %(organizer_id)s)
            ON CONFLICT DO NOTHING
            """,
            {
                "competition_id": competition_id,
                "organizer_id": organizer_email,
            },
        )

    if desired_organizer_ids:
        cur.execute(
            """
            DELETE FROM competition_organizers
            WHERE competition_id = %(competition_id)s
              AND organizer_id <> ALL(%(organizer_ids)s)
            """,
            {
                "competition_id": competition_id,
                "organizer_ids": desired_organizer_ids,
            },
        )
    else:
        cur.execute(
            "DELETE FROM competition_organizers WHERE competition_id = %s",
            (competition_id,),
        )

    desired_delegate_ids = []
    for delegate_name, delegate_email in parse_wca_staff(delegates_raw):
        desired_delegate_ids.append(delegate_email)
        if delegate_email not in delegate_ids:
            cur.execute(
                "SELECT wca_id FROM persons WHERE name = %s",
                (delegate_name,),
            )
            person_res = cur.fetchone()
            person_id = person_res.wca_id if person_res else None
            if person_id:
                cur.execute(
                    """
                    INSERT INTO delegates (id, person_id, status)
                    VALUES (%(id)s, %(person_id)s, 'active')
                    ON CONFLICT DO NOTHING
                    """,
                    {"id": delegate_email, "person_id": person_id},
                )
                delegate_ids.add(delegate_email)
        if delegate_email in delegate_ids:
            cur.execute(
                """
                INSERT INTO competition_delegates (competition_id, delegate_id)
                VALUES (%(competition_id)s, %(delegate_id)s)
                ON CONFLICT DO NOTHING
                """,
                {
                    "competition_id": competition_id,
                    "delegate_id": delegate_email,
                },
            )

    if desired_delegate_ids:
        cur.execute(
            """
            DELETE FROM competition_delegates
            WHERE competition_id = %(competition_id)s
              AND delegate_id <> ALL(%(delegate_ids)s)
            """,
            {
                "competition_id": competition_id,
                "delegate_ids": desired_delegate_ids,
            },
        )
    else:
        cur.execute(
            "DELETE FROM competition_delegates WHERE competition_id = %s",
            (competition_id,),
        )


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
            mx_results_before = None
            record_markers_before = None
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
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")
                    cleaned_content = file_content.replace('"', "")
                    df = pd.read_csv(io.StringIO(cleaned_content), delimiter="\t", na_values=["NULL"])
                    competitions = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                            cur.execute("SELECT * FROM states")
                            states = cur.fetchall()

                            cur.execute("SELECT id FROM delegates")
                            delegate_ids = {row.id for row in cur.fetchall()}

                            cur.execute("SELECT id FROM organizers")
                            organizer_ids = {row.id for row in cur.fetchall()}

                            cur.execute("SELECT id FROM competitions")
                            existing = cur.fetchall()
                            existing_ids = {row.id for row in existing}
                            newly_inserted_mx_ids: list[str] = []

                            for row in competitions:
                                if row["id"] in existing_ids:
                                    continue
                                state_id = None
                                if row["country_id"] == "Mexico":
                                    newly_inserted_mx_ids.append(row["id"])
                                    state_name = get_state_from_coordinates(
                                        row["latitude_microdegrees"] / 1000000,
                                        row["longitude_microdegrees"] / 1000000,
                                    )
                                    if state_name:
                                        for s in states:
                                            if s.name == state_name:
                                                state_id = s.id
                                                break
                                start_date = datetime(row["year"], row["month"], row["day"])
                                end_date = datetime(row["year"], row["end_month"], row["end_day"])
                                logo = extract_first_image_url(row.get("information"))
                                cur.execute(
                                    """
                                    INSERT INTO competitions
                                    (id, name, city_name, country_id, information, start_date, end_date, cancelled,
                                     venue, venue_address, venue_details, external_website, cell_name,
                                     latitude_microdegrees, longitude_microdegrees, state_id, logo)
                                    VALUES (%(id)s, %(name)s, %(city_name)s, %(country_id)s, %(information)s,
                                            %(start_date)s, %(end_date)s, %(cancelled)s, %(venue)s,
                                            %(venue_address)s, %(venue_details)s, %(external_website)s,
                                            %(cell_name)s, %(latitude_microdegrees)s, %(longitude_microdegrees)s,
                                            %(state_id)s, %(logo)s)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    {
                                        "id": row["id"],
                                        "name": row["name"],
                                        "city_name": row["city_name"],
                                        "country_id": row["country_id"],
                                        "information": row["information"],
                                        "start_date": start_date,
                                        "end_date": end_date,
                                        "cancelled": bool(row["cancelled"]),
                                        "venue": row["venue"],
                                        "venue_address": row["venue_address"],
                                        "venue_details": row["venue_details"],
                                        "external_website": row["external_website"],
                                        "cell_name": row["cell_name"],
                                        "latitude_microdegrees": row["latitude_microdegrees"],
                                        "longitude_microdegrees": row["longitude_microdegrees"],
                                        "state_id": state_id,
                                        "logo": logo,
                                    },
                                )
                                if row["country_id"] == "Mexico":
                                    for event_spec in str(row["event_specs"]).split():
                                        cur.execute(
                                            """
                                            INSERT INTO competition_events (competition_id, event_id)
                                            VALUES (%(competition_id)s, %(event_id)s)
                                            ON CONFLICT DO NOTHING
                                            """,
                                            {
                                                "competition_id": row["id"],
                                                "event_id": event_spec,
                                            },
                                        )

                                    sync_mexican_competition_staff(
                                        cur,
                                        row["id"],
                                        row.get("organizers"),
                                        row.get("delegates"),
                                        organizer_ids,
                                        delegate_ids,
                                    )

                    if newly_inserted_mx_ids:
                        try:
                            from social.poster import post_new_upcoming_competitions

                            post_new_upcoming_competitions(newly_inserted_mx_ids)
                        except Exception as e:
                            log.exception(
                                "Social PRÓXIMAS posting failed (competitions import succeeded): %s",
                                e,
                            )

                elif file_name == "WCA_export_championships.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")
                    cleaned_content = file_content.replace('"', "")
                    df = pd.read_csv(
                        io.StringIO(cleaned_content), delimiter="\t", skip_blank_lines=True, na_values=["NULL"]
                    )
                    championships = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            for row in championships:
                                cur.execute(
                                    """
                                    INSERT INTO championships (id, competition_id, championship_type)
                                    VALUES (%(id)s, %(competition_id)s, %(championship_type)s)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    {
                                        "id": row["id"],
                                        "competition_id": row["competition_id"],
                                        "championship_type": row["championship_type"],
                                    },
                                )

                elif file_name == "WCA_export_events.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")
                    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True)
                    events = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            for row in events:
                                cur.execute(
                                    """
                                    INSERT INTO events (id, format, name, rank)
                                    VALUES (%(id)s, %(format)s, %(name)s, %(rank)s)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    {
                                        "id": row["id"],
                                        "format": row["format"],
                                        "name": row["name"],
                                        "rank": row["rank"],
                                    },
                                )

                elif file_name == "WCA_export_round_types.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")
                    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True)
                    round_types = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            for row in round_types:
                                cur.execute(
                                    """
                                    INSERT INTO round_types (id, final, name, rank, cell_name)
                                    VALUES (%(id)s, %(final)s, %(name)s, %(rank)s, %(cell_name)s)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    {
                                        "id": row["id"],
                                        "final": bool(row["final"]),
                                        "name": row["name"],
                                        "rank": row["rank"],
                                        "cell_name": row["cell_name"],
                                    },
                                )

                elif file_name == "WCA_export_formats.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")
                    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True)
                    formats = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            for row in formats:
                                cur.execute(
                                    """
                                    INSERT INTO formats (id, expected_solve_count, name, sort_by, sort_by_second, trim_fastest_n, trim_slowest_n)
                                    VALUES (%(id)s, %(expected_solve_count)s, %(name)s, %(sort_by)s, %(sort_by_second)s, %(trim_fastest_n)s, %(trim_slowest_n)s)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    {
                                        "id": row["id"],
                                        "expected_solve_count": row["expected_solve_count"],
                                        "name": row["name"],
                                        "sort_by": row["sort_by"],
                                        "sort_by_second": row["sort_by_second"],
                                        "trim_fastest_n": bool(row["trim_fastest_n"]),
                                        "trim_slowest_n": bool(row["trim_slowest_n"]),
                                    },
                                )

                elif file_name == "WCA_export_persons.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")
                    df = pd.read_csv(
                        io.StringIO(file_content), delimiter="\t", skip_blank_lines=True, na_values=["NULL"]
                    )
                    persons = df.to_dict(orient="records")
                    cleaned_persons = []
                    for p in persons:
                        if p["country_id"] == "Mexico":
                            gender = p.get("gender")
                            gender = None if pd.isna(gender) else str(gender)
                            cleaned_persons.append({"wca_id": p["wca_id"], "name": p["name"], "gender": gender})
                    with get_connection() as conn:
                        with conn.cursor() as cur:
                            for row in cleaned_persons:
                                cur.execute(
                                    """
                                    INSERT INTO persons (wca_id, name, gender)
                                    VALUES (%(wca_id)s, %(name)s, %(gender)s)
                                    ON CONFLICT DO NOTHING
                                    """,
                                    row,
                                )

                elif file_name == "WCA_export_ranks_average.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")

                    if not file_content.strip() or len(file_content.strip().split("\n")) <= 1:
                        log.info("File %s is empty or contains only headers. Skipping processing.", file_name)
                        continue

                    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True, low_memory=False)

                    if df.empty:
                        log.info("File %s resulted in empty DataFrame. Skipping processing.", file_name)
                        continue

                    data = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                            cur.execute("SELECT wca_id FROM persons")
                            persons = cur.fetchall()
                            person_ids = {p.wca_id for p in persons}
                            filtered = [d for d in data if d["person_id"] in person_ids]
                            cur.execute("DELETE FROM ranks_average")

                            rows_to_insert = [
                                (
                                    row["person_id"],
                                    row["event_id"],
                                    row["best"],
                                    row["world_rank"],
                                    row["continent_rank"],
                                    row["country_rank"],
                                )
                                for row in filtered
                            ]

                            execute_values(
                                cur,
                                """
                                INSERT INTO ranks_average
                                (person_id, event_id, best, world_rank, continent_rank, country_rank)
                                VALUES %s
                                ON CONFLICT DO NOTHING
                                """,
                                rows_to_insert,
                            )

                elif file_name == "WCA_export_ranks_single.tsv":
                    log.info("Processing file: %s", file_name)
                    file_content = z.read(file_name).decode("utf-8")

                    if not file_content.strip() or len(file_content.strip().split("\n")) <= 1:
                        log.info("File %s is empty or contains only headers. Skipping processing.", file_name)
                        continue

                    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True, low_memory=False)

                    if df.empty:
                        log.info("File %s resulted in empty DataFrame. Skipping processing.", file_name)
                        continue

                    data = df.to_dict(orient="records")
                    with get_connection() as conn:
                        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                            cur.execute("SELECT wca_id FROM persons")
                            persons = cur.fetchall()
                            person_ids = {p.wca_id for p in persons}
                            filtered = [d for d in data if d["person_id"] in person_ids]
                            cur.execute("DELETE FROM ranks_single")

                            rows_to_insert = [
                                (
                                    row["person_id"],
                                    row["event_id"],
                                    row["best"],
                                    row["world_rank"],
                                    row["continent_rank"],
                                    row["country_rank"],
                                )
                                for row in filtered
                            ]

                            execute_values(
                                cur,
                                """
                                INSERT INTO ranks_single
                                (person_id, event_id, best, world_rank, continent_rank, country_rank)
                                VALUES %s
                                ON CONFLICT DO NOTHING
                                """,
                                rows_to_insert,
                            )

                elif file_name == "WCA_export_results.tsv":
                    log.info("Evaluating file for processing: %s", file_name)
                    file_bytes = z.read(file_name)

                    try:
                        log.info("Pre-checking personIds in %s against the database.", file_name)
                        with get_connection() as conn:
                            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                cur.execute("SELECT wca_id FROM persons")
                                db_persons = cur.fetchall()
                                db_person_ids = {p.wca_id for p in db_persons}

                        df_results_persons = pd.read_csv(
                            io.BytesIO(file_bytes),
                            delimiter="\t",
                            usecols=["person_id", "person_country_id"],
                            skip_blank_lines=True,
                            na_values=["NULL"],
                            low_memory=False,
                        )

                        df_mexico_results = df_results_persons[df_results_persons["person_country_id"] == "Mexico"]
                        file_person_ids = set(df_mexico_results["person_id"].unique())

                        missing_person_ids = file_person_ids - db_person_ids

                        if missing_person_ids:
                            log.error(
                                "SKIPPING update for %s due to corrupted data. The following person_ids "
                                "from the results file do not exist in the persons table: %s (showing up "
                                "to 10). This indicates a corrupted export file. The 'results' table "
                                "will not be modified.",
                                file_name,
                                list(missing_person_ids)[:10],
                            )
                            continue
                    except Exception as e:
                        log.exception(
                            "Error during person_id pre-check for %s: %s. Skipping processing of this file to be safe.",
                            file_name,
                            e,
                        )
                        continue

                    try:
                        with get_connection() as conn:
                            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                cur.execute("""
                                    SELECT value FROM export_metadata WHERE key = 'last_competition'
                                """)
                                metadata_record = cur.fetchone()
                                last_processed_comp_id = metadata_record.value if metadata_record else None

                                if not last_processed_comp_id:
                                    log.info(
                                        "No 'last_competition' record in export_metadata. Proceeding with "
                                        "full processing as this might be the first run."
                                    )
                                else:
                                    df_comp_ids = pd.read_csv(
                                        io.BytesIO(file_bytes),
                                        delimiter="\t",
                                        usecols=["competition_id"],
                                        skip_blank_lines=True,
                                        na_values=["NULL"],
                                        low_memory=False,
                                    )

                                    if df_comp_ids.empty:
                                        log.warning(
                                            "%s is empty or has no competition IDs. Skipping metadata check.",
                                            file_name,
                                        )
                                    else:
                                        file_comp_ids = list(df_comp_ids["competition_id"].dropna().unique())

                                        if not file_comp_ids:
                                            log.warning(
                                                "No valid competition IDs found in %s. Skipping metadata check.",
                                                file_name,
                                            )
                                        else:
                                            cur.execute(
                                                """
                                                SELECT id, start_date FROM competitions
                                                WHERE id = ANY(%s)
                                                ORDER BY start_date DESC, id DESC
                                                LIMIT 1
                                            """,
                                                (file_comp_ids,),
                                            )
                                            latest_comp_in_file = cur.fetchone()

                                            if not latest_comp_in_file:
                                                log.warning(
                                                    "None of the competition IDs from %s exist in the "
                                                    "'competitions' table. Cannot determine if file is outdated. "
                                                    "Proceeding with caution.",
                                                    file_name,
                                                )
                                            else:
                                                cur.execute(
                                                    """
                                                    SELECT start_date FROM competitions WHERE id = %s
                                                """,
                                                    (last_processed_comp_id,),
                                                )
                                                last_processed_comp = cur.fetchone()

                                                if not last_processed_comp:
                                                    log.warning(
                                                        "Last processed competition ID '%s' not found in "
                                                        "'competitions' table. Proceeding with processing.",
                                                        last_processed_comp_id,
                                                    )
                                                elif latest_comp_in_file.start_date <= last_processed_comp.start_date:
                                                    log.info(
                                                        "SKIPPING update for %s. The latest competition in this "
                                                        "file ('%s' on %s) is not newer than the last successfully "
                                                        "processed competition ('%s' on %s).",
                                                        file_name,
                                                        latest_comp_in_file.id,
                                                        latest_comp_in_file.start_date.date(),
                                                        last_processed_comp_id,
                                                        last_processed_comp.start_date.date(),
                                                    )
                                                    continue
                                                else:
                                                    log.info(
                                                        "Proceeding with %s. Its latest competition ('%s') is newer "
                                                        "than the last processed one.",
                                                        file_name,
                                                        latest_comp_in_file.id,
                                                    )
                    except Exception as e:
                        log.exception(
                            "Error during metadata pre-check for %s: %s. Skipping processing of this file to be safe.",
                            file_name,
                            e,
                        )
                        continue

                    log.info(
                        "Starting full processing for %s, including data validation and insertion.",
                        file_name,
                    )

                    try:
                        from social.poster import fetch_mexican_competition_ids_with_results, fetch_record_markers

                        with get_connection() as conn:
                            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                mx_results_before = fetch_mexican_competition_ids_with_results(cur)
                                record_markers_before = fetch_record_markers(cur)
                        log.info(
                            "Snapshot: %s Mexican competitions currently have results; %s regional record markers.",
                            len(mx_results_before),
                            len(record_markers_before),
                        )
                    except Exception as e:
                        log.exception(
                            "Failed to snapshot Mexican competitions/records before "
                            "import: %s. Social posts may be skipped.",
                            e,
                        )
                        mx_results_before = None
                        record_markers_before = None

                    try:
                        from social.mollerz import fetch_mollerz_members

                        with get_connection() as conn:
                            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                mollerz_before = fetch_mollerz_members(cur)
                        log.info(
                            "Snapshot: %s Mollerz members before import.",
                            len(mollerz_before),
                        )
                    except Exception as e:
                        log.exception(
                            "Failed to snapshot Mollerz members before import: %s. "
                            "Mollerz social posts will be skipped.",
                            e,
                        )
                        mollerz_before = None

                    chunk_size = 10_000_000
                    total_chunks = -(-len(file_bytes) // chunk_size) if len(file_bytes) > 0 else 0
                    headers = None
                    all_rows_to_insert = []
                    is_data_corrupt = False

                    if total_chunks == 0:
                        log.info(
                            "File %s is empty. Clearing 'results' table as per standard procedure, but "
                            "no data will be inserted.",
                            file_name,
                        )
                        with get_connection() as conn:
                            with conn.cursor() as cur:
                                cur.execute("DELETE FROM results")
                        log.info("'results' table cleared due to processing empty file %s.", file_name)
                        results_updated = True
                    else:
                        for i in range(total_chunks):
                            if is_data_corrupt:
                                break

                            start = i * chunk_size
                            end = (i + 1) * chunk_size
                            chunk_bytes = file_bytes[start:end]
                            chunk_str = chunk_bytes.decode("utf-8", errors="ignore")

                            log.info("Validating chunk %s of %s for %s", i + 1, total_chunks, file_name)

                            current_df_chunk = None
                            if i == 0:
                                current_df_chunk = pd.read_csv(
                                    io.StringIO(chunk_str),
                                    delimiter="\t",
                                    skip_blank_lines=True,
                                    na_values=["NULL"],
                                    low_memory=False,
                                    dtype={"id": str},
                                )
                                if not current_df_chunk.empty:
                                    headers = current_df_chunk.columns.tolist()
                                    log.debug("Headers extracted from first chunk: %s", headers)
                                else:
                                    log.warning(
                                        "First chunk of %s is empty. Aborting processing.",
                                        file_name,
                                    )
                                    break
                            else:
                                if headers is None:
                                    log.error(
                                        "Headers not available for chunk %s. Aborting processing.",
                                        i + 1,
                                    )
                                    break
                                chunk_with_headers_str = "\t".join(headers) + "\n" + chunk_str
                                current_df_chunk = pd.read_csv(
                                    io.StringIO(chunk_with_headers_str),
                                    delimiter="\t",
                                    skip_blank_lines=True,
                                    na_values=["NULL"],
                                    low_memory=False,
                                    header=0,
                                    names=headers,
                                    dtype={"id": str},
                                )

                            if current_df_chunk is None or current_df_chunk.empty:
                                log.info("Chunk %s is empty. Skipping.", i + 1)
                                continue

                            for col in headers:
                                if col not in current_df_chunk.columns:
                                    current_df_chunk[col] = pd.NA

                            df_filtered = current_df_chunk[current_df_chunk["person_country_id"] == "Mexico"]

                            if df_filtered.empty:
                                continue

                            for _, row in df_filtered.iterrows():
                                try:
                                    pos_val = row["pos"]
                                    if pd.isna(pos_val):
                                        pos = 0
                                    else:
                                        pos = int(pos_val)
                                        if not -32768 <= pos <= 32767:
                                            log.error(
                                                "CORRUPTED DATA DETECTED: 'pos' value %s is out of smallint "
                                                "range. Problematic row: %s. Aborting update for %s. The "
                                                "'results' table will not be modified.",
                                                pos,
                                                row.to_dict(),
                                                file_name,
                                            )
                                            is_data_corrupt = True
                                            break

                                    # Extract and clean regional single/average record values
                                    reg_single = row["regional_single_record"]
                                    reg_average = row["regional_average_record"]

                                    # If pandas marks them as NaN/NA, or if they are the string "NaN", convert to None
                                    if pd.isna(reg_single) or reg_single == "NaN":
                                        reg_single = None
                                    if pd.isna(reg_average) or reg_average == "NaN":
                                        reg_average = None

                                    all_rows_to_insert.append(
                                        (
                                            row["id"],
                                            row["competition_id"],
                                            row["event_id"],
                                            row["round_type_id"],
                                            pos,
                                            row["best"],
                                            row["average"],
                                            row["person_id"],
                                            row["format_id"],
                                            reg_single,  # Updated variable
                                            reg_average,  # Updated variable
                                        )
                                    )
                                except (KeyError, ValueError, TypeError) as e:
                                    log.error(
                                        "CORRUPTED DATA DETECTED: Error processing row in chunk %s: %s. "
                                        "Problematic row: %s. Aborting update for %s. The 'results' table "
                                        "will not be modified.",
                                        i + 1,
                                        e,
                                        row.to_dict(),
                                        file_name,
                                    )
                                    is_data_corrupt = True
                                    break

                        if is_data_corrupt:
                            log.warning(
                                "Skipping database update for %s due to corrupted data. 'results' table "
                                "remains untouched.",
                                file_name,
                            )
                            continue

                        log.info(
                            "All chunks for %s validated successfully. Total rows to insert for Mexico: %s.",
                            file_name,
                            len(all_rows_to_insert),
                        )

                        if all_rows_to_insert:
                            log.info("Proceeding with atomic update for 'results' table.")
                            with get_connection() as conn:
                                with conn.cursor() as cur:
                                    try:
                                        log.info("Clearing all data from 'results' table.")
                                        cur.execute("DELETE FROM results")

                                        log.info(
                                            "Inserting %s rows into 'results' table.",
                                            len(all_rows_to_insert),
                                        )
                                        execute_values(
                                            cur,
                                            """
                                            INSERT INTO results
                                            (id, competition_id, event_id, round_type_id, pos, best, average,
                                            person_id, format_id, regional_single_record, regional_average_record)
                                            VALUES %s
                                            ON CONFLICT DO NOTHING
                                            """,
                                            all_rows_to_insert,
                                        )
                                        conn.commit()
                                        log.info(
                                            "Successfully committed changes to 'results' table for %s.",
                                            file_name,
                                        )
                                        results_updated = True
                                    except Exception as e:
                                        log.exception(
                                            "An error occurred during the atomic update for %s: %s. Rolling "
                                            "back transaction.",
                                            file_name,
                                            e,
                                        )
                                        conn.rollback()
                                        continue
                        else:
                            log.info(
                                "No rows for 'Mexico' found in %s. Clearing 'results' table as no new data "
                                "is available.",
                                file_name,
                            )
                            with get_connection() as conn:
                                with conn.cursor() as cur:
                                    cur.execute("DELETE FROM results")
                            log.info("'results' table cleared.")
                            results_updated = True

                        log.info("Finished processing all chunks for %s.", file_name)

                        try:
                            with get_connection() as conn:
                                with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                    log.info("Finding the latest competition with results to update metadata.")
                                    cur.execute(
                                        """
                                        SELECT c.id
                                        FROM competitions c
                                        JOIN (SELECT DISTINCT competition_id FROM results) r ON c.id = r.competition_id
                                        ORDER BY c.start_date DESC
                                        LIMIT 1;
                                    """
                                    )
                                    latest_competition = cur.fetchone()

                                    if latest_competition:
                                        latest_competition_id = latest_competition.id
                                        log.info(
                                            "Latest competition with results found: %s. Updating metadata.",
                                            latest_competition_id,
                                        )
                                        cur.execute(
                                            """
                                            INSERT INTO export_metadata (key, value, updated_at)
                                            VALUES (%s, %s, NOW())
                                            ON CONFLICT (key) DO UPDATE
                                            SET value = EXCLUDED.value,
                                                updated_at = EXCLUDED.updated_at;
                                        """,
                                            ("last_competition", latest_competition_id),
                                        )
                                    else:
                                        log.warning(
                                            "Could not determine the latest competition from the results table."
                                        )
                        except Exception as e:
                            log.exception("Failed to update 'last_competition' metadata: %s", e)

                        if mx_results_before is not None:
                            try:
                                from social.poster import (
                                    fetch_mexican_competition_ids_with_results,
                                    fetch_record_markers,
                                    post_new_mexican_results,
                                    post_new_records,
                                )

                                with get_connection() as conn:
                                    with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                        mx_results_after = fetch_mexican_competition_ids_with_results(cur)
                                        record_markers_after = fetch_record_markers(cur)
                                post_new_records(record_markers_before, record_markers_after)
                                post_new_mexican_results(mx_results_before, mx_results_after)
                            except Exception as e:
                                log.exception(
                                    "Social RESULTADOS/RÉCORDS posting failed (database import succeeded): %s",
                                    e,
                                )

                        if mollerz_before is not None:
                            try:
                                from social.mollerz import fetch_mollerz_members
                                from social.poster import post_new_mollerz

                                with get_connection() as conn:
                                    with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                                        mollerz_after = fetch_mollerz_members(cur)
                                post_new_mollerz(mollerz_before, mollerz_after)
                            except Exception as e:
                                log.exception(
                                    "Social MOLLERZ posting failed (database import succeeded): %s",
                                    e,
                                )

                        try:
                            log.info("Importing WCIF round dates for competitions with new results")
                            schedule_body = run_update_competition_schedules()
                            log.info("Competition schedules update finished: %s", schedule_body)
                        except Exception as e:
                            log.exception(
                                "Competition schedules update failed (database import succeeded): %s",
                                e,
                            )

                elif file_name == "WCA_export_result_attempts.tsv":
                    if not results_updated:
                        log.info("Results table update was skipped. Skipping result attempts as well.")
                        continue
                    log.info("Processing file: %s", file_name)
                    file_bytes = z.read(file_name)

                    with get_connection() as conn:
                        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                            cur.execute("SELECT id FROM results")
                            db_results = cur.fetchall()
                            db_result_ids = {r.id for r in db_results}

                    if not db_result_ids:
                        log.info(
                            "No results found in the database. Skipping %s as there are no "
                            "result_ids to match against.",
                            file_name,
                        )
                        continue

                    log.info(
                        "Found %s result IDs in the database to filter attempts against.",
                        len(db_result_ids),
                    )

                    chunk_size = 10_000_000
                    total_chunks = -(-len(file_bytes) // chunk_size) if len(file_bytes) > 0 else 0
                    headers = None
                    all_rows_to_insert = []
                    is_data_corrupt = False

                    if total_chunks == 0:
                        log.info(
                            "File %s is empty. Clearing 'result_attempts' table.",
                            file_name,
                        )
                        with get_connection() as conn:
                            with conn.cursor() as cur:
                                cur.execute("DELETE FROM result_attempts")
                    else:
                        for i in range(total_chunks):
                            if is_data_corrupt:
                                break

                            start = i * chunk_size
                            end = (i + 1) * chunk_size
                            chunk_bytes = file_bytes[start:end]
                            chunk_str = chunk_bytes.decode("utf-8", errors="ignore")

                            log.info("Validating chunk %s of %s for %s", i + 1, total_chunks, file_name)

                            current_df_chunk = None
                            if i == 0:
                                current_df_chunk = pd.read_csv(
                                    io.StringIO(chunk_str),
                                    delimiter="\t",
                                    skip_blank_lines=True,
                                    na_values=["NULL"],
                                    low_memory=False,
                                    dtype={"result_id": str},
                                )
                                if not current_df_chunk.empty:
                                    headers = current_df_chunk.columns.tolist()
                                    log.debug("Headers extracted from first chunk: %s", headers)
                                else:
                                    log.warning(
                                        "First chunk of %s is empty. Aborting processing.",
                                        file_name,
                                    )
                                    break
                            else:
                                if headers is None:
                                    log.error(
                                        "Headers not available for chunk %s. Aborting processing.",
                                        i + 1,
                                    )
                                    break
                                chunk_with_headers_str = "\t".join(headers) + "\n" + chunk_str
                                current_df_chunk = pd.read_csv(
                                    io.StringIO(chunk_with_headers_str),
                                    delimiter="\t",
                                    skip_blank_lines=True,
                                    na_values=["NULL"],
                                    low_memory=False,
                                    header=0,
                                    names=headers,
                                    dtype={"result_id": str},
                                )

                            if current_df_chunk is None or current_df_chunk.empty:
                                log.info("Chunk %s is empty. Skipping.", i + 1)
                                continue

                            for col in headers:
                                if col not in current_df_chunk.columns:
                                    current_df_chunk[col] = pd.NA

                            df_filtered = current_df_chunk[current_df_chunk["result_id"].isin(db_result_ids)]

                            if df_filtered.empty:
                                continue

                            for _, row in df_filtered.iterrows():
                                try:
                                    all_rows_to_insert.append(
                                        (
                                            int(row["value"]),
                                            int(row["attempt_number"]),
                                            str(row["result_id"]),
                                        )
                                    )
                                except (KeyError, ValueError, TypeError) as e:
                                    log.error(
                                        "CORRUPTED DATA DETECTED: Error processing row in chunk %s: %s. "
                                        "Problematic row: %s. Aborting update for %s. The 'result_attempts' table "
                                        "will not be modified.",
                                        i + 1,
                                        e,
                                        row.to_dict(),
                                        file_name,
                                    )
                                    is_data_corrupt = True
                                    break

                        if is_data_corrupt:
                            log.warning(
                                "Skipping database update for %s due to corrupted data. 'result_attempts' table "
                                "remains untouched.",
                                file_name,
                            )
                            continue

                        log.info(
                            "All chunks for %s validated successfully. Total rows to insert: %s.",
                            file_name,
                            len(all_rows_to_insert),
                        )

                        if all_rows_to_insert:
                            log.info("Proceeding with atomic update for 'result_attempts' table.")
                            with get_connection() as conn:
                                with conn.cursor() as cur:
                                    try:
                                        log.info("Clearing all data from 'result_attempts' table.")
                                        cur.execute("DELETE FROM result_attempts")

                                        log.info(
                                            "Inserting %s rows into 'result_attempts' table.",
                                            len(all_rows_to_insert),
                                        )
                                        execute_values(
                                            cur,
                                            """
                                            INSERT INTO result_attempts
                                            (value, attempt_number, result_id)
                                            VALUES %s
                                            ON CONFLICT DO NOTHING
                                            """,
                                            all_rows_to_insert,
                                        )
                                        conn.commit()
                                        log.info(
                                            "Successfully committed changes to 'result_attempts' table for %s.",
                                            file_name,
                                        )
                                    except Exception as e:
                                        log.exception(
                                            "An error occurred during the atomic update for %s: %s. Rolling "
                                            "back transaction.",
                                            file_name,
                                            e,
                                        )
                                        conn.rollback()
                                        continue
                        else:
                            log.info("No rows match Mexican results. Clearing 'result_attempts' table.")
                            with get_connection() as conn:
                                with conn.cursor() as cur:
                                    cur.execute("DELETE FROM result_attempts")
                            log.info("'result_attempts' table cleared.")

                        log.info("Finished processing all chunks for %s.", file_name)

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
