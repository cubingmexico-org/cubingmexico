"""Runs the WCA export import against a small in-memory export zip."""

import io
import json
import zipfile

import pytest

from routes.admin import wca_import_results
from routes.admin.wca_import import process_wca_export

from .factories import fetch_all

MX_COMP = "MexicoOpen2024"
US_COMP = "USNationals2024"


def _tsv(rows):
    headers = list(rows[0])
    lines = ["\t".join(headers)]
    lines += ["\t".join("NULL" if row[h] is None else str(row[h]) for h in headers) for row in rows]
    return "\n".join(lines) + "\n"


def _competition(competition_id, country_id, month, organizers="", delegates=""):
    return {
        "id": competition_id,
        "name": competition_id,
        "information": None,
        "external_website": None,
        "venue": "Venue",
        "city_name": "City",
        "country_id": country_id,
        "venue_address": "Address",
        "venue_details": None,
        "cell_name": competition_id,
        "cancelled": 0,
        "event_specs": "333 222",
        "latitude_microdegrees": 19432608,
        "longitude_microdegrees": -99133209,
        "year": 2024,
        "month": month,
        "day": 1,
        "end_month": month,
        "end_day": 2,
        "organizers": organizers,
        "delegates": delegates,
    }


def _result(result_id, competition_id, person_id, country, best, record=None):
    return {
        "id": result_id,
        "competition_id": competition_id,
        "event_id": "333",
        "round_type_id": "f",
        "pos": 1,
        "best": best,
        "average": best + 100,
        "person_name": person_id,
        "person_id": person_id,
        "person_country_id": country,
        "format_id": "a",
        "regional_single_record": record,
        "regional_average_record": None,
    }


def _rank(person_id, best, country_rank):
    return {
        "person_id": person_id,
        "event_id": "333",
        "best": best,
        "world_rank": country_rank * 10,
        "continent_rank": country_rank * 2,
        "country_rank": country_rank,
    }


EXPORT_FILES = {
    "WCA_export_events.tsv": _tsv(
        [
            {"id": "333", "name": "3x3x3 Cube", "rank": 10, "format": "time"},
            {"id": "222", "name": "2x2x2 Cube", "rank": 20, "format": "time"},
        ]
    ),
    "WCA_export_formats.tsv": _tsv(
        [
            {
                "id": "a",
                "name": "Average of 5",
                "sort_by": "average",
                "sort_by_second": "single",
                "expected_solve_count": 5,
                "trim_fastest_n": 1,
                "trim_slowest_n": 1,
            }
        ]
    ),
    "WCA_export_round_types.tsv": _tsv([{"id": "f", "rank": 99, "name": "Final", "cell_name": "Final", "final": 1}]),
    "WCA_export_persons.tsv": _tsv(
        [
            {"wca_id": "2015MEXI01", "sub_id": 1, "name": "Ana Mexicana", "country_id": "Mexico", "gender": "f"},
            {"wca_id": "2016MEXI02", "sub_id": 1, "name": "Beto Mexicano", "country_id": "Mexico", "gender": "m"},
            {"wca_id": "2014USAA01", "sub_id": 1, "name": "Carl American", "country_id": "USA", "gender": "m"},
        ]
    ),
    "WCA_export_competitions.tsv": _tsv(
        [
            _competition(
                MX_COMP,
                "Mexico",
                3,
                organizers="{Ana Mexicana}{mailto:ana@example.com}",
                delegates="{Beto Mexicano}{mailto:beto@example.com}",
            ),
            _competition(US_COMP, "USA", 7),
        ]
    ),
    "WCA_export_championships.tsv": _tsv(
        [{"id": "1", "competition_id": MX_COMP, "championship_type": "MX"}],
    ),
    "WCA_export_ranks_single.tsv": _tsv(
        [_rank("2015MEXI01", 700, 1), _rank("2016MEXI02", 900, 2), _rank("2014USAA01", 500, 1)]
    ),
    "WCA_export_ranks_average.tsv": _tsv([_rank("2015MEXI01", 800, 1)]),
    "WCA_export_results.tsv": _tsv(
        [
            _result("1", MX_COMP, "2015MEXI01", "Mexico", 700, record="NR"),
            _result("2", MX_COMP, "2016MEXI02", "Mexico", 900),
            _result("3", US_COMP, "2015MEXI01", "Mexico", 750),
            _result("4", US_COMP, "2014USAA01", "USA", 500),
        ]
    ),
    "WCA_export_result_attempts.tsv": _tsv(
        [
            {"value": 700, "attempt_number": 1, "result_id": "1"},
            {"value": 710, "attempt_number": 2, "result_id": "1"},
            {"value": 500, "attempt_number": 1, "result_id": "4"},
        ]
    ),
    "metadata.json": json.dumps({"export_date": "2024-08-01T00:00:00Z", "export_format_version": "2.0.0"}),
}


def _export_zip(files=EXPORT_FILES):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        for name, content in files.items():
            z.writestr(name, content)
    buffer.seek(0)
    return zipfile.ZipFile(buffer)


@pytest.fixture(autouse=True)
def no_schedule_fetch(monkeypatch):
    calls = []
    monkeypatch.setattr(wca_import_results, "run_update_competition_schedules", lambda: calls.append(1) or {})
    return calls


def _count(db, table):
    return fetch_all(db, f"SELECT COUNT(*) AS n FROM {table}")[0]["n"]


def test_imports_every_file(db, no_schedule_fetch):
    with _export_zip() as z:
        assert process_wca_export(z) == {"resultsUpdated": True}

    assert [row["wca_id"] for row in fetch_all(db, "SELECT wca_id FROM persons ORDER BY wca_id")] == [
        "2015MEXI01",
        "2016MEXI02",
    ]
    assert _count(db, "competitions") == 2
    assert fetch_all(db, "SELECT event_id FROM competition_events ORDER BY event_id") == [
        {"event_id": "222"},
        {"event_id": "333"},
    ]
    assert fetch_all(db, "SELECT organizer_id FROM competition_organizers") == [{"organizer_id": "ana@example.com"}]
    assert fetch_all(db, "SELECT delegate_id FROM competition_delegates") == [{"delegate_id": "beto@example.com"}]
    assert _count(db, "championships") == 1

    assert fetch_all(db, "SELECT person_id, country_rank FROM ranks_single ORDER BY country_rank") == [
        {"person_id": "2015MEXI01", "country_rank": 1},
        {"person_id": "2016MEXI02", "country_rank": 2},
    ]
    assert _count(db, "ranks_average") == 1

    results = fetch_all(db, "SELECT id, person_id, regional_single_record FROM results ORDER BY id")
    assert results == [
        {"id": "1", "person_id": "2015MEXI01", "regional_single_record": "NR"},
        {"id": "2", "person_id": "2016MEXI02", "regional_single_record": None},
        {"id": "3", "person_id": "2015MEXI01", "regional_single_record": None},
    ]
    assert fetch_all(db, "SELECT result_id, attempt_number, value FROM result_attempts ORDER BY attempt_number") == [
        {"result_id": "1", "attempt_number": 1, "value": 700},
        {"result_id": "1", "attempt_number": 2, "value": 710},
    ]

    metadata = {row["key"]: row["value"] for row in fetch_all(db, "SELECT key, value FROM export_metadata")}
    assert metadata == {"wca_export_date": "2024-08-01T00:00:00Z", "last_competition": US_COMP}
    assert no_schedule_fetch == [1]


def test_reimporting_the_same_export_is_a_no_op(db):
    with _export_zip() as z:
        process_wca_export(z)
    with _export_zip() as z:
        assert process_wca_export(z) == {"resultsUpdated": False}

    assert _count(db, "persons") == 2
    assert _count(db, "competitions") == 2
    assert _count(db, "results") == 3
    assert _count(db, "result_attempts") == 2


def test_results_with_unknown_mexican_persons_are_rejected(db):
    files = dict(EXPORT_FILES)
    files["WCA_export_results.tsv"] = _tsv(
        [
            _result("1", MX_COMP, "2015MEXI01", "Mexico", 700),
            _result("9", MX_COMP, "2019GHOS01", "Mexico", 800),
        ]
    )
    with _export_zip(files) as z:
        assert process_wca_export(z) == {"resultsUpdated": False}

    assert _count(db, "results") == 0
    assert _count(db, "result_attempts") == 0


def test_rows_spanning_read_chunks_are_all_imported(db, monkeypatch):
    monkeypatch.setattr(wca_import_results, "CHUNK_ROWS", 5)
    results = [
        _result(str(i), MX_COMP, "2015MEXI01" if i % 2 else "2016MEXI02", "Mexico", 700 + i) for i in range(1, 13)
    ]
    for result in results:
        result["person_name"] = "Ñandú Pérez"
    files = dict(EXPORT_FILES)
    files["WCA_export_results.tsv"] = _tsv(results)
    files["WCA_export_result_attempts.tsv"] = _tsv(
        [{"value": 700 + i, "attempt_number": n, "result_id": str(i)} for i in range(1, 13) for n in (1, 2)]
    )

    with _export_zip(files) as z:
        assert process_wca_export(z) == {"resultsUpdated": True}

    assert _count(db, "results") == 12
    assert _count(db, "result_attempts") == 24


def test_missing_files_are_skipped(db):
    files = {name: content for name, content in EXPORT_FILES.items() if name != "WCA_export_championships.tsv"}
    with _export_zip(files) as z:
        assert process_wca_export(z) == {"resultsUpdated": True}

    assert _count(db, "championships") == 0
    assert _count(db, "results") == 3
