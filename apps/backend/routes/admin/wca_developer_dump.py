"""Authoritative Dual Round fields from the WCA developer SQL dump.

Public Results TSV has local `pos` only. The developer dump includes `results.global_pos`
and `rounds.linked_round_id` (FK to `linked_rounds`). Non-NULL `linked_round_id` means the
round is part of a Dual (Reg 9v) pair — the only authoritative dual signal.
"""

from __future__ import annotations

import io
import os
import tempfile
import zipfile
from collections.abc import Iterable, Iterator, Mapping, Sequence
from contextlib import contextmanager, suppress
from pathlib import Path
from typing import Any, BinaryIO, TextIO

import requests

from common import log

# Permalink used by https://www.worldcubeassociation.org/export/developer
WCA_DEVELOPER_DUMP_URL = "https://exports.worldcubeassociation.org/developer/wca-developer-database-dump.zip"
WCA_DEVELOPER_DUMP_PATH_ENV = "WCA_DEVELOPER_DUMP_PATH"
WCA_DEVELOPER_DUMP_TIMEOUT = (30, 600)

# results: id, average, best, competition_id, country_id, event_id, format_id,
#          global_pos, person_id, person_name, pos, regional_average_record,
#          regional_single_record, round_id, round_type_id, updated_at
_RESULTS_ID = 0
_RESULTS_GLOBAL_POS = 7
_RESULTS_ROUND_ID = 13

# rounds: id, advancement_condition, competition_event_id, created_at, cutoff,
#         format_id, is_h2h_mock, linked_round_id, number, ...
_ROUNDS_ID = 0
_ROUNDS_LINKED_ROUND_ID = 7


def split_mysql_values(tuple_line: str) -> list[str | None] | None:
    """Parse one mysqldump VALUES tuple line into field values (NULL → None)."""
    line = tuple_line.strip()
    if not line.startswith("("):
        return None
    if line.endswith("),") or line.endswith(");"):
        body = line[1:-2]
    elif line.endswith(")"):
        body = line[1:-1]
    else:
        return None

    fields: list[str | None] = []
    i = 0
    n = len(body)
    while i < n:
        while i < n and body[i] in " \t":
            i += 1
        if i >= n:
            break
        if body.startswith("NULL", i) and (i + 4 == n or body[i + 4] in ", \t"):
            fields.append(None)
            i += 4
        elif body[i] == "'":
            i += 1
            chunks: list[str] = []
            while i < n:
                ch = body[i]
                if ch == "\\" and i + 1 < n:
                    chunks.append(body[i + 1])
                    i += 2
                    continue
                if ch == "'":
                    i += 1
                    break
                chunks.append(ch)
                i += 1
            fields.append("".join(chunks))
        else:
            j = i
            while j < n and body[j] != ",":
                j += 1
            fields.append(body[i:j].strip())
            i = j
        while i < n and body[i] in " \t":
            i += 1
        if i < n and body[i] == ",":
            i += 1
    return fields


def _open_dump_sql(source: str | Path | BinaryIO) -> tuple[TextIO, Any]:
    """Return (text stream over the .sql member, closer). Caller must close `closer`."""
    if isinstance(source, (str, Path)):
        zf = zipfile.ZipFile(source)
        names = zf.namelist()
        if not names:
            zf.close()
            raise ValueError("Developer dump zip is empty")
        raw = zf.open(names[0])
        text = io.TextIOWrapper(raw, encoding="utf-8", errors="replace", newline="")
        return text, zf

    zf = zipfile.ZipFile(source)
    names = zf.namelist()
    if not names:
        zf.close()
        raise ValueError("Developer dump zip is empty")
    raw = zf.open(names[0])
    text = io.TextIOWrapper(raw, encoding="utf-8", errors="replace", newline="")
    return text, zf


def _iter_table_tuples(sql: TextIO, table: str) -> Iterator[list[str | None]]:
    marker = f"INSERT INTO `{table}` VALUES"
    in_insert = False
    for line in sql:
        if not in_insert:
            if line.startswith(marker):
                in_insert = True
            continue
        if line.startswith("("):
            fields = split_mysql_values(line)
            if fields is not None:
                yield fields
            continue
        if line.startswith(f"INSERT INTO `{table}`"):
            continue
        # Next table / unlock / structure comment ends this insert block.
        if in_insert:
            return


def parse_dual_round_ids(source: str | Path | BinaryIO) -> set[str]:
    """Round ids whose `linked_round_id` is non-NULL (Dual Round members)."""
    sql, closer = _open_dump_sql(source)
    try:
        dual: set[str] = set()
        for fields in _iter_table_tuples(sql, "rounds"):
            if len(fields) <= _ROUNDS_LINKED_ROUND_ID:
                continue
            round_id = fields[_ROUNDS_ID]
            linked = fields[_ROUNDS_LINKED_ROUND_ID]
            if round_id is not None and linked is not None:
                dual.add(str(round_id))
        log.info("Developer dump: %s dual-linked rounds.", len(dual))
        return dual
    finally:
        sql.close()
        closer.close()


def parse_result_dual_fields(
    source: str | Path | BinaryIO,
    *,
    result_ids: Iterable[str] | None = None,
    dual_round_ids: set[str] | None = None,
) -> dict[str, tuple[int, bool]]:
    """Map result id → (global_pos, is_dual) from the developer dump.

    When `result_ids` is set, only those rows are kept. The dump lists `results`
    before `rounds`, so a single pass collects result rows first, then dual round
    ids, then joins. Pass `dual_round_ids` to skip the rounds scan when known.
    """
    wanted = {str(rid) for rid in result_ids} if result_ids is not None else None
    known_dual = dual_round_ids

    sql, closer = _open_dump_sql(source)
    try:
        # result_id -> (global_pos, round_id)
        pending: dict[str, tuple[int, str | None]] = {}
        for fields in _iter_table_tuples(sql, "results"):
            if len(fields) <= _RESULTS_ROUND_ID:
                continue
            result_id = fields[_RESULTS_ID]
            if result_id is None:
                continue
            rid = str(result_id)
            if wanted is not None and rid not in wanted:
                continue
            global_raw = fields[_RESULTS_GLOBAL_POS]
            round_raw = fields[_RESULTS_ROUND_ID]
            try:
                global_pos = int(global_raw) if global_raw is not None else 0
            except (TypeError, ValueError):
                global_pos = 0
            pending[rid] = (global_pos, str(round_raw) if round_raw is not None else None)
            if wanted is not None and len(pending) >= len(wanted):
                # Abandon the rest of results; rounds are later in the same dump stream.
                break

        if known_dual is None:
            # Same SQL stream: skip ahead to rounds (after results in mysqldump order).
            known_dual = set()
            for fields in _iter_table_tuples(sql, "rounds"):
                if len(fields) <= _ROUNDS_LINKED_ROUND_ID:
                    continue
                round_id = fields[_ROUNDS_ID]
                linked = fields[_ROUNDS_LINKED_ROUND_ID]
                if round_id is not None and linked is not None:
                    known_dual.add(str(round_id))
            log.info("Developer dump: %s dual-linked rounds.", len(known_dual))

        out = {
            rid: (global_pos, round_id is not None and round_id in known_dual)
            for rid, (global_pos, round_id) in pending.items()
        }
        log.info(
            "Developer dump: annotated %s results (%s dual).",
            len(out),
            sum(1 for _, is_dual in out.values() if is_dual),
        )
        return out
    finally:
        sql.close()
        closer.close()


def download_developer_dump(dest_path: str | Path) -> Path:
    """Download the developer dump zip to `dest_path` and return the path."""
    dest = Path(dest_path)
    log.info("Downloading WCA developer dump from %s", WCA_DEVELOPER_DUMP_URL)
    with requests.get(WCA_DEVELOPER_DUMP_URL, stream=True, timeout=WCA_DEVELOPER_DUMP_TIMEOUT) as response:
        response.raise_for_status()
        with dest.open("wb") as out:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    out.write(chunk)
    size_mb = dest.stat().st_size / (1024 * 1024)
    log.info("Downloaded developer dump to %s (%.1f MiB).", dest, size_mb)
    return dest


@contextmanager
def developer_dump_file() -> Iterator[Path]:
    """Yield a local developer dump zip path; downloads unless `WCA_DEVELOPER_DUMP_PATH` is set."""
    env_path = os.environ.get(WCA_DEVELOPER_DUMP_PATH_ENV)
    if env_path:
        path = Path(env_path)
        if path.is_file():
            log.info("Using local developer dump at %s", path)
            yield path
            return
        log.warning("%s=%s is not a file; downloading instead.", WCA_DEVELOPER_DUMP_PATH_ENV, env_path)

    with tempfile.NamedTemporaryFile(prefix="wca-developer-dump-", suffix=".zip", delete=False) as tmp:
        dest = Path(tmp.name)
    try:
        download_developer_dump(dest)
        yield dest
    finally:
        with suppress(OSError):
            dest.unlink(missing_ok=True)


def load_dual_annotations_for_result_ids(result_ids: Sequence[str]) -> dict[str, tuple[int, bool]]:
    """Download (or open local) dump and return dual annotations for the given result ids."""
    ids = [str(rid) for rid in result_ids if rid]
    if not ids:
        return {}
    with developer_dump_file() as dump_path:
        return parse_result_dual_fields(dump_path, result_ids=ids)


def apply_dump_annotations(
    rows: Sequence[Mapping[str, Any]],
    annotations: Mapping[str, tuple[int, bool]],
) -> dict[str, tuple[int, bool]]:
    """For each row id, prefer dump annotation; else (pos, False)."""
    out: dict[str, tuple[int, bool]] = {}
    for row in rows:
        result_id = str(row.get("id") or "")
        if not result_id:
            continue
        pos = int(row.get("pos") or 0)
        out[result_id] = annotations.get(result_id, (pos, False))
    return out
