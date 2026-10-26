"""Insert helpers for integration tests. Columns not passed get the same defaults as apps/web/test/factories.ts."""

from datetime import date, datetime
from typing import Any

AUTH_HEADERS = {"Authorization": "Bearer test-secret"}


def _insert(conn, table: str, values: dict[str, Any]) -> None:
    columns = ", ".join(values)
    placeholders = ", ".join(["%s"] * len(values))
    with conn.cursor() as cur:
        cur.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", tuple(values.values()))


def insert_state(conn, state_id: str, name: str | None = None) -> None:
    _insert(conn, "states", {"id": state_id, "name": name or state_id})


def insert_event(conn, event_id: str, rank: int, *, format: str = "time") -> None:
    _insert(conn, "events", {"id": event_id, "format": format, "name": event_id, "rank": rank})


def insert_person(conn, wca_id: str, *, state_id: str | None = None, name: str | None = None) -> None:
    _insert(
        conn,
        "persons",
        {"wca_id": wca_id, "name": name or f"Person {wca_id}", "gender": "m", "state_id": state_id},
    )


def insert_competition(conn, competition_id: str, start_date: date | datetime, **values: Any) -> None:
    _insert(
        conn,
        "competitions",
        {
            "id": competition_id,
            "name": competition_id,
            "venue": "Venue",
            "city_name": "Ciudad de México",
            "country_id": "Mexico",
            "cell_name": competition_id[:45],
            "start_date": start_date,
            "end_date": start_date,
            **values,
        },
    )


def insert_round_type(conn, round_type_id: str, rank: int) -> None:
    _insert(
        conn,
        "round_types",
        {
            "id": round_type_id,
            "name": f"Round {round_type_id}",
            "cell_name": f"Round {round_type_id}",
            "final": round_type_id == "f",
            "rank": rank,
        },
    )


def insert_rank(conn, kind: str, person_id: str, event_id: str, best: int, **values: Any) -> None:
    table = "ranks_single" if kind == "single" else "ranks_average"
    country_rank = values.pop("country_rank", 1)
    _insert(
        conn,
        table,
        {
            "person_id": person_id,
            "event_id": event_id,
            "best": best,
            "world_rank": country_rank,
            "continent_rank": country_rank,
            "country_rank": country_rank,
            **values,
        },
    )


def insert_result(
    conn,
    result_id: str,
    competition_id: str,
    event_id: str,
    person_id: str,
    *,
    best: int = 0,
    average: int = 0,
    **values: Any,
) -> None:
    _insert(
        conn,
        "results",
        {
            "id": result_id,
            "competition_id": competition_id,
            "event_id": event_id,
            "person_id": person_id,
            "best": best,
            "average": average,
            "format_id": "a",
            **values,
        },
    )


def fetch_all(conn, query: str, params: tuple = ()) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(query, params)
        return [dict(row) for row in cur.fetchall()]
