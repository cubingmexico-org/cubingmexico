"""WCA export import: results and result attempts."""

# pandas-stubs types boolean masks and Series arithmetic more strictly than the runtime behavior used here.
# pyright: reportArgumentType=warning, reportGeneralTypeIssues=warning

import io
from collections.abc import Iterator
from dataclasses import dataclass

import pandas as pd
import psycopg2
import psycopg2.extras
from psycopg2.extras import execute_values

from common import get_connection, log
from routes.admin.schedules import run_update_competition_schedules

CHUNK_ROWS = 200_000


def _read_tsv_chunks(file_bytes: bytes, file_name: str, string_column: str) -> Iterator[tuple[int, pd.DataFrame]]:
    """Yields `(chunk_number, rows)` for each CHUNK_ROWS rows of a TSV export file.

    Chunks split on row boundaries, so no row is cut in two. `string_column` is read as text.
    """
    reader = pd.read_csv(
        io.BytesIO(file_bytes),
        delimiter="\t",
        skip_blank_lines=True,
        na_values=["NULL"],
        dtype={string_column: str},
        encoding_errors="ignore",
        chunksize=CHUNK_ROWS,
    )
    for chunk_number, df_chunk in enumerate(reader, start=1):
        log.info("Validating chunk %s of %s", chunk_number, file_name)
        if df_chunk.empty:
            continue
        yield chunk_number, df_chunk


def _replace_table_rows(table: str, insert_sql: str, rows: list[tuple], file_name: str) -> bool:
    """Atomically replaces every row of `table`; returns False (after rolling back) on failure."""
    log.info("Proceeding with atomic update for '%s' table.", table)
    with get_connection() as conn:
        with conn.cursor() as cur:
            try:
                log.info("Clearing all data from '%s' table.", table)
                cur.execute(f"DELETE FROM {table}")

                log.info("Inserting %s rows into '%s' table.", len(rows), table)
                execute_values(cur, insert_sql, rows)
                conn.commit()
                log.info("Successfully committed changes to '%s' table for %s.", table, file_name)
                return True
            except Exception as e:
                log.exception(
                    "An error occurred during the atomic update for %s: %s. Rolling back transaction.",
                    file_name,
                    e,
                )
                conn.rollback()
                return False


def _clear_table(table: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {table}")


def _mexican_person_ids_exist(file_bytes: bytes, file_name: str) -> bool:
    """False when a Mexican result points at a person missing from `persons`, a sign of a corrupted export."""
    try:
        log.info("Pre-checking personIds in %s against the database.", file_name)
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                cur.execute("SELECT wca_id FROM persons")
                db_person_ids = {p.wca_id for p in cur.fetchall()}

        df_results_persons = pd.read_csv(
            io.BytesIO(file_bytes),
            delimiter="\t",
            usecols=["person_id", "person_country_id"],
            skip_blank_lines=True,
            na_values=["NULL"],
            low_memory=False,
        )

        df_mexico_results = df_results_persons[df_results_persons["person_country_id"] == "Mexico"]
        missing_person_ids = set(df_mexico_results["person_id"].unique()) - db_person_ids

        if missing_person_ids:
            log.error(
                "SKIPPING update for %s due to corrupted data. The following person_ids "
                "from the results file do not exist in the persons table: %s (showing up "
                "to 10). This indicates a corrupted export file. The 'results' table "
                "will not be modified.",
                file_name,
                list(missing_person_ids)[:10],
            )
            return False
        return True
    except Exception as e:
        log.exception(
            "Error during person_id pre-check for %s: %s. Skipping processing of this file to be safe.",
            file_name,
            e,
        )
        return False


def _has_newer_competitions(file_bytes: bytes, file_name: str) -> bool:
    """False when the export's latest competition isn't newer than the last imported one."""
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
                    return True

                df_comp_ids = pd.read_csv(
                    io.BytesIO(file_bytes),
                    delimiter="\t",
                    usecols=["competition_id"],
                    skip_blank_lines=True,
                    na_values=["NULL"],
                    low_memory=False,
                )
                if df_comp_ids.empty:
                    log.warning("%s is empty or has no competition IDs. Skipping metadata check.", file_name)
                    return True

                file_comp_ids = list(df_comp_ids["competition_id"].dropna().unique())
                if not file_comp_ids:
                    log.warning("No valid competition IDs found in %s. Skipping metadata check.", file_name)
                    return True

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
                    return True

                cur.execute(
                    """
                    SELECT start_date FROM competitions WHERE id = %s
                """,
                    (last_processed_comp_id,),
                )
                last_processed_comp = cur.fetchone()
                if not last_processed_comp:
                    log.warning(
                        "Last processed competition ID '%s' not found in 'competitions' table. Proceeding with processing.",
                        last_processed_comp_id,
                    )
                    return True

                if latest_comp_in_file.start_date <= last_processed_comp.start_date:
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
                    return False

                log.info(
                    "Proceeding with %s. Its latest competition ('%s') is newer than the last processed one.",
                    file_name,
                    latest_comp_in_file.id,
                )
                return True
    except Exception as e:
        log.exception(
            "Error during metadata pre-check for %s: %s. Skipping processing of this file to be safe.",
            file_name,
            e,
        )
        return False


@dataclass
class _SocialSnapshot:
    """What the social posts compare against after the import; None where the snapshot failed."""

    mx_results: set[str] | None = None
    record_markers: dict[str, dict] | None = None
    mollerz: dict[str, dict] | None = None


def _snapshot_social_state() -> _SocialSnapshot:
    snapshot = _SocialSnapshot()
    try:
        from social.poster import fetch_mexican_competition_ids_with_results, fetch_record_markers

        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                snapshot.mx_results = fetch_mexican_competition_ids_with_results(cur)
                snapshot.record_markers = fetch_record_markers(cur)
        log.info(
            "Snapshot: %s Mexican competitions currently have results; %s regional record markers.",
            len(snapshot.mx_results),
            len(snapshot.record_markers),
        )
    except Exception as e:
        log.exception(
            "Failed to snapshot Mexican competitions/records before import: %s. Social posts may be skipped.",
            e,
        )
        snapshot.mx_results = None
        snapshot.record_markers = None

    try:
        from social.mollerz import fetch_mollerz_members

        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                snapshot.mollerz = fetch_mollerz_members(cur)
        log.info("Snapshot: %s Mollerz members before import.", len(snapshot.mollerz))
    except Exception as e:
        log.exception(
            "Failed to snapshot Mollerz members before import: %s. Mollerz social posts will be skipped.",
            e,
        )
        snapshot.mollerz = None

    return snapshot


def _parse_mexican_results(file_bytes: bytes, file_name: str) -> list[tuple] | None:
    """Rows to insert for results of Mexican competitors, or None when a row is corrupted."""
    rows: list[tuple] = []

    for chunk_number, df_chunk in _read_tsv_chunks(file_bytes, file_name, "id"):
        df_filtered = df_chunk[df_chunk["person_country_id"] == "Mexico"]

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
                        return None

                # pandas reads missing records as NaN, and some exports spell them "NaN".
                reg_single = row["regional_single_record"]
                reg_average = row["regional_average_record"]
                if pd.isna(reg_single) or reg_single == "NaN":
                    reg_single = None
                if pd.isna(reg_average) or reg_average == "NaN":
                    reg_average = None

                rows.append(
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
                        reg_single,
                        reg_average,
                    )
                )
            except (KeyError, ValueError, TypeError) as e:
                log.error(
                    "CORRUPTED DATA DETECTED: Error processing row in chunk %s: %s. "
                    "Problematic row: %s. Aborting update for %s. The 'results' table "
                    "will not be modified.",
                    chunk_number,
                    e,
                    row.to_dict(),
                    file_name,
                )
                return None

    return rows


def _update_last_competition() -> None:
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


def _post_social_updates(before: _SocialSnapshot) -> None:
    """Posts new RESULTADOS, RÉCORDS and MOLLERZ by comparing against the pre-import snapshot."""
    if before.mx_results is not None:
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
            post_new_records(before.record_markers, record_markers_after)
            post_new_mexican_results(before.mx_results, mx_results_after)
        except Exception as e:
            log.exception("Social RESULTADOS/RÉCORDS posting failed (database import succeeded): %s", e)

    if before.mollerz is not None:
        try:
            from social.mollerz import fetch_mollerz_members
            from social.poster import post_new_mollerz

            with get_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
                    mollerz_after = fetch_mollerz_members(cur)
            post_new_mollerz(before.mollerz, mollerz_after)
        except Exception as e:
            log.exception("Social MOLLERZ posting failed (database import succeeded): %s", e)


def _update_competition_schedules() -> None:
    try:
        log.info("Importing WCIF round dates for competitions with new results")
        schedule_body = run_update_competition_schedules()
        log.info("Competition schedules update finished: %s", schedule_body)
    except Exception as e:
        log.exception("Competition schedules update failed (database import succeeded): %s", e)


def import_results(z, file_name) -> bool:
    """Validate and replace Mexican results; returns whether the results table was updated."""
    log.info("Evaluating file for processing: %s", file_name)
    file_bytes = z.read(file_name)

    if not _mexican_person_ids_exist(file_bytes, file_name):
        return False
    if not _has_newer_competitions(file_bytes, file_name):
        return False

    log.info("Starting full processing for %s, including data validation and insertion.", file_name)
    social_before = _snapshot_social_state()

    if not file_bytes:
        log.info(
            "File %s is empty. Clearing 'results' table as per standard procedure, but no data will be inserted.",
            file_name,
        )
        _clear_table("results")
        log.info("'results' table cleared due to processing empty file %s.", file_name)
        return True

    rows = _parse_mexican_results(file_bytes, file_name)
    if rows is None:
        log.warning(
            "Skipping database update for %s due to corrupted data. 'results' table remains untouched.",
            file_name,
        )
        return False

    log.info(
        "All chunks for %s validated successfully. Total rows to insert for Mexico: %s.",
        file_name,
        len(rows),
    )

    if rows:
        replaced = _replace_table_rows(
            "results",
            """
            INSERT INTO results
            (id, competition_id, event_id, round_type_id, pos, best, average,
            person_id, format_id, regional_single_record, regional_average_record)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            rows,
            file_name,
        )
        if not replaced:
            return False
    else:
        log.info("No rows for 'Mexico' found in %s. Clearing 'results' table as no new data is available.", file_name)
        _clear_table("results")
        log.info("'results' table cleared.")

    log.info("Finished processing all chunks for %s.", file_name)

    _update_last_competition()
    _post_social_updates(social_before)
    _update_competition_schedules()
    return True


def import_result_attempts(z, file_name):
    log.info("Processing file: %s", file_name)
    file_bytes = z.read(file_name)

    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor) as cur:
            cur.execute("SELECT id FROM results")
            db_result_ids = {r.id for r in cur.fetchall()}

    if not db_result_ids:
        log.info(
            "No results found in the database. Skipping %s as there are no result_ids to match against.",
            file_name,
        )
        return

    log.info("Found %s result IDs in the database to filter attempts against.", len(db_result_ids))

    if not file_bytes:
        log.info("File %s is empty. Clearing 'result_attempts' table.", file_name)
        _clear_table("result_attempts")
        return

    rows: list[tuple] = []
    for chunk_number, df_chunk in _read_tsv_chunks(file_bytes, file_name, "result_id"):
        df_filtered = df_chunk[df_chunk["result_id"].isin(db_result_ids)]

        for _, row in df_filtered.iterrows():
            try:
                rows.append((int(row["value"]), int(row["attempt_number"]), str(row["result_id"])))
            except (KeyError, ValueError, TypeError) as e:
                log.error(
                    "CORRUPTED DATA DETECTED: Error processing row in chunk %s: %s. "
                    "Problematic row: %s. Aborting update for %s. The 'result_attempts' table "
                    "will not be modified.",
                    chunk_number,
                    e,
                    row.to_dict(),
                    file_name,
                )
                log.warning(
                    "Skipping database update for %s due to corrupted data. 'result_attempts' table remains untouched.",
                    file_name,
                )
                return

    log.info("All chunks for %s validated successfully. Total rows to insert: %s.", file_name, len(rows))

    if rows:
        replaced = _replace_table_rows(
            "result_attempts",
            """
            INSERT INTO result_attempts
            (value, attempt_number, result_id)
            VALUES %s
            ON CONFLICT DO NOTHING
            """,
            rows,
            file_name,
        )
        if not replaced:
            return
    else:
        log.info("No rows match Mexican results. Clearing 'result_attempts' table.")
        _clear_table("result_attempts")
        log.info("'result_attempts' table cleared.")

    log.info("Finished processing all chunks for %s.", file_name)
