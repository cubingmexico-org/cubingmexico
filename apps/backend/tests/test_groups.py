"""Group record tagging reuses the same chronological rules as state SR."""

from collections import namedtuple

from routes.admin.state import _mark_state_records

RecordRow = namedtuple("RecordRow", ["id", "value", "record_date", "regional_record"])


def test_group_record_marking_follows_state_rules():
    rows = [
        RecordRow("r1", 1000, "2024-01-01", None),
        RecordRow("r2", 900, "2024-01-02", None),
        RecordRow("r3", 850, "2024-01-03", "NR"),
        RecordRow("r4", 700, "2024-01-04", None),
    ]
    out = []
    _mark_state_records(rows, out)
    # Chronological improvements; NR advances the bar but is not tagged.
    assert out == ["r1", "r2", "r4"]
