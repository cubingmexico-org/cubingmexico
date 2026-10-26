"""WCA export import: results and result attempts."""

# pandas-stubs types boolean masks and Series arithmetic more strictly than the runtime behavior used here.
# pyright: reportArgumentType=warning, reportGeneralTypeIssues=warning

import io

import pandas as pd
import psycopg2
import psycopg2.extras
from psycopg2.extras import execute_values

from common import get_connection, log
from routes.admin.schedules import run_update_competition_schedules


def import_results(z, file_name) -> bool:
    """Validate and replace Mexican results; returns whether the results table was updated."""
    results_updated = False
    mx_results_before = None
    record_markers_before = None

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
            return results_updated
    except Exception as e:
        log.exception(
            "Error during person_id pre-check for %s: %s. Skipping processing of this file to be safe.",
            file_name,
            e,
        )
        return results_updated

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
                                    return results_updated
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
        return results_updated

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
            "Failed to snapshot Mexican competitions/records before import: %s. Social posts may be skipped.",
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
            "Failed to snapshot Mollerz members before import: %s. Mollerz social posts will be skipped.",
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
            "File %s is empty. Clearing 'results' table as per standard procedure, but no data will be inserted.",
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
                "Skipping database update for %s due to corrupted data. 'results' table remains untouched.",
                file_name,
            )
            return results_updated

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
                            "An error occurred during the atomic update for %s: %s. Rolling back transaction.",
                            file_name,
                            e,
                        )
                        conn.rollback()
                        return results_updated
        else:
            log.info(
                "No rows for 'Mexico' found in %s. Clearing 'results' table as no new data is available.",
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
                        log.warning("Could not determine the latest competition from the results table.")
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

    return results_updated


def import_result_attempts(z, file_name):
    log.info("Processing file: %s", file_name)
    file_bytes = z.read(file_name)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            cur.execute("SELECT id FROM results")
            db_results = cur.fetchall()
            db_result_ids = {r.id for r in db_results}

    if not db_result_ids:
        log.info(
            "No results found in the database. Skipping %s as there are no result_ids to match against.",
            file_name,
        )
        return

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
                "Skipping database update for %s due to corrupted data. 'result_attempts' table remains untouched.",
                file_name,
            )
            return

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
                            "An error occurred during the atomic update for %s: %s. Rolling back transaction.",
                            file_name,
                            e,
                        )
                        conn.rollback()
                        return
        else:
            log.info("No rows match Mexican results. Clearing 'result_attempts' table.")
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM result_attempts")
            log.info("'result_attempts' table cleared.")

        log.info("Finished processing all chunks for %s.", file_name)
