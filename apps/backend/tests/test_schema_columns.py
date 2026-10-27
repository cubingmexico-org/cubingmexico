"""Checks the columns the backend writes against the Drizzle schema.

`fixtures/schema/columns.json` is generated from packages/db/src/schema.ts
(`pnpm --filter @workspace/db export-columns`) and CI fails when it drifts. Every
SQL string literal in the backend is scanned for INSERT column lists, UPDATE ... SET
targets and ON CONFLICT ... DO UPDATE SET targets, so a renamed or dropped column
fails here instead of in production.
"""

import ast
import json
import re
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
COLUMNS_FILE = BACKEND_DIR.parents[1] / "fixtures" / "schema" / "columns.json"
SKIPPED_DIRS = {"tests", "tests_integration", ".venv", "node_modules", "__pycache__"}

# Tables the backend creates itself at runtime instead of through a Drizzle migration.
BACKEND_OWNED_TABLES = {"social_temp_media"}

# Statements with an f-string `{table}` name, and every table that name can take.
DYNAMIC_TABLES = {
    "routes/admin/state.py": ("ranks_single", "ranks_average"),
}

PLACEHOLDER = "{}"
TABLE = r"(\{\}|\w+)"
INSERT_RE = re.compile(rf"\bINSERT INTO\s+{TABLE}\s*\(([^)]*)\)")
UPDATE_RE = re.compile(
    rf"(?<!DO\s)\bUPDATE\s+(?!SET\b){TABLE}(?:\s+(?!SET\b)\w+)?\s+SET\s+(.+?)(?=\bFROM\b|\bWHERE\b|\bRETURNING\b|$)",
    re.DOTALL,
)
CONFLICT_UPDATE_RE = re.compile(r"\bDO UPDATE\s+SET\s+(.+?)(?=\bWHERE\b|\bRETURNING\b|$)", re.DOTALL)
CREATE_TABLE_RE = re.compile(r"\bCREATE TABLE IF NOT EXISTS\s+(\w+)\s*\((.*)\)", re.DOTALL)
ASSIGNMENT_RE = re.compile(r"^\s*(\w+)\s*=(?!=)")


def _source_files():
    for path in sorted(BACKEND_DIR.rglob("*.py")):
        if SKIPPED_DIRS.isdisjoint(path.relative_to(BACKEND_DIR).parts):
            yield path


def _string_literals(tree):
    """Every string literal, with f-string interpolations replaced by `{}`."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            yield node.value
        elif isinstance(node, ast.JoinedStr):
            yield "".join(str(part.value) if isinstance(part, ast.Constant) else PLACEHOLDER for part in node.values)


def _split_top_level(text):
    parts, depth, current = [], 0, []
    for char in text:
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
        if char == "," and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(char)
    parts.append("".join(current))
    return [part for part in parts if part.strip()]


def _assigned_columns(set_clause, where):
    columns = []
    for assignment in _split_top_level(set_clause):
        match = ASSIGNMENT_RE.match(assignment)
        if not match:
            raise AssertionError(f"{where}: can't parse SET assignment {assignment.strip()!r}")
        columns.append(match.group(1))
    return columns


def _column_list(text):
    return [column.strip().strip('"') for column in text.split(",") if column.strip()]


def _writes(path, sql):
    """(table, columns) pairs written by one SQL string."""
    where = str(path.relative_to(BACKEND_DIR))
    writes = []
    for match in INSERT_RE.finditer(sql):
        table, columns = match.group(1), _column_list(match.group(2))
        writes.append((table, columns))
        rest = sql[match.end() :]
        conflict = CONFLICT_UPDATE_RE.search(rest)
        if conflict:
            writes.append((table, _assigned_columns(conflict.group(1), where)))
    for match in UPDATE_RE.finditer(sql):
        writes.append((match.group(1), _assigned_columns(match.group(2), where)))
    return writes


def _collect():
    writes, owned = [], {}
    for path in _source_files():
        tree = ast.parse(path.read_text(), filename=str(path))
        for sql in _string_literals(tree):
            for match in CREATE_TABLE_RE.finditer(sql):
                owned[match.group(1)] = [definition.split()[0] for definition in _split_top_level(match.group(2))]
            for table, columns in _writes(path, sql):
                writes.append((str(path.relative_to(BACKEND_DIR)), table, columns))
    return writes, owned


@pytest.fixture(scope="module")
def collected():
    return _collect()


@pytest.fixture(scope="module")
def schema():
    return {table: set(columns) for table, columns in json.loads(COLUMNS_FILE.read_text()).items()}


def test_finds_the_backend_writes(collected):
    writes, _ = collected
    tables = {table for _, table, _ in writes}
    # Guards the scanner itself: if the regexes stop matching, every other check passes vacuously.
    assert {"results", "ranks_single", "job_runs", "nemesis_stats", "competition_round_dates"} <= tables
    assert len(writes) >= 45


def test_runtime_tables_are_allowlisted(collected):
    _, owned = collected
    assert set(owned) == BACKEND_OWNED_TABLES, (
        "Create new tables with a Drizzle migration in packages/db, not CREATE TABLE in the backend"
    )


def test_written_columns_exist(collected, schema):
    writes, owned = collected
    tables = {**schema, **{table: set(columns) for table, columns in owned.items()}}
    problems = []
    for path, table, columns in writes:
        if table == PLACEHOLDER:
            candidates = DYNAMIC_TABLES.get(path)
            if not candidates:
                problems.append(f"{path}: dynamic table name; list its tables in DYNAMIC_TABLES")
                continue
        else:
            candidates = (table,)
        for candidate in candidates:
            if candidate not in tables:
                problems.append(f"{path}: table {candidate} is not in the schema")
                continue
            missing = sorted(set(columns) - tables[candidate])
            if missing:
                problems.append(f"{path}: {candidate} has no column(s) {', '.join(missing)}")
    assert not problems, "\n".join(problems)
