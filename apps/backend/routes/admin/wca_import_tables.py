"""WCA export import: reference tables (events, round types, formats), persons and ranks."""

# pandas-stubs types boolean masks and Series arithmetic more strictly than the runtime behavior used here.
# pyright: reportArgumentType=warning, reportGeneralTypeIssues=warning

import io

import pandas as pd

from common import execute_values, get_connection, log, named_row


def import_events(z, file_name):
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


def import_round_types(z, file_name):
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


def import_formats(z, file_name):
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


def import_persons(z, file_name):
    log.info("Processing file: %s", file_name)
    file_content = z.read(file_name).decode("utf-8")
    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True, na_values=["NULL"])
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


def import_ranks_average(z, file_name):
    log.info("Processing file: %s", file_name)
    file_content = z.read(file_name).decode("utf-8")

    if not file_content.strip() or len(file_content.strip().split("\n")) <= 1:
        log.info("File %s is empty or contains only headers. Skipping processing.", file_name)
        return

    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True, low_memory=False)

    if df.empty:
        log.info("File %s resulted in empty DataFrame. Skipping processing.", file_name)
        return

    data = df.to_dict(orient="records")
    with get_connection() as conn:
        with conn.cursor(row_factory=named_row) as cur:
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


def import_ranks_single(z, file_name):
    log.info("Processing file: %s", file_name)
    file_content = z.read(file_name).decode("utf-8")

    if not file_content.strip() or len(file_content.strip().split("\n")) <= 1:
        log.info("File %s is empty or contains only headers. Skipping processing.", file_name)
        return

    df = pd.read_csv(io.StringIO(file_content), delimiter="\t", skip_blank_lines=True, low_memory=False)

    if df.empty:
        log.info("File %s resulted in empty DataFrame. Skipping processing.", file_name)
        return

    data = df.to_dict(orient="records")
    with get_connection() as conn:
        with conn.cursor(row_factory=named_row) as cur:
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
