"""Unit tests for Dual Round global_pos computation."""

from routes.admin.dual_rounds import (
    annotate_dual_fields,
    compute_global_positions,
    detect_dual_pair_types,
    extract_dual_pairs_from_wcif,
)


def _row(**kwargs):
    base = {
        "id": "1",
        "competition_id": "LosFuertesV3Puebla2026",
        "event_id": "555bf",
        "round_type_id": "1",
        "pos": 1,
        "best": 1000,
        "average": 0,
        "person_id": "2014SALA15",
        "format_id": "3",
    }
    base.update(kwargs)
    return base


def test_detect_dual_pair_by_overlap():
    rows = [
        _row(id="a1", round_type_id="1", person_id="P1", pos=1, best=60000),
        _row(id="a2", round_type_id="1", person_id="P2", pos=2, best=61000),
        _row(id="a3", round_type_id="1", person_id="P3", pos=3, best=62000),
        _row(id="b1", round_type_id="f", person_id="P1", pos=2, best=-1),
        _row(id="b2", round_type_id="f", person_id="P2", pos=1, best=59000),
        _row(id="b3", round_type_id="f", person_id="P3", pos=3, best=-1),
    ]
    assert detect_dual_pair_types(rows) == frozenset({"1", "f"})


def test_detect_skips_normal_advancement():
    rows = [
        _row(id="a1", round_type_id="1", person_id="P1", pos=1, best=1000),
        _row(id="a2", round_type_id="1", person_id="P2", pos=2, best=1100),
        _row(id="a3", round_type_id="1", person_id="P3", pos=3, best=1200),
        _row(id="a4", round_type_id="1", person_id="P4", pos=4, best=1300),
        # Only top 2 advance
        _row(id="b1", round_type_id="f", person_id="P1", pos=1, best=900),
        _row(id="b2", round_type_id="f", person_id="P2", pos=2, best=950),
    ]
    assert detect_dual_pair_types(rows) is None


def test_global_pos_prefers_better_round_like_2014sala15():
    """Successful first + DNF final still earns global bronze."""
    rows = [
        _row(id="p1r1", round_type_id="1", person_id="P1", pos=1, best=50000),
        _row(id="p2r1", round_type_id="1", person_id="P2", pos=2, best=62600),
        _row(id="p3r1", round_type_id="1", person_id="P3", pos=3, best=55000),
        _row(id="p1f", round_type_id="f", person_id="P1", pos=1, best=48000),
        _row(id="p2f", round_type_id="f", person_id="P2", pos=3, best=-1),
        _row(id="p3f", round_type_id="f", person_id="P3", pos=2, best=56000),
    ]
    global_by_id = compute_global_positions(rows, frozenset({"1", "f"}))
    # P1 best 48000 → 1st; P3 best 55000 → 2nd; P2 best 62600 → 3rd (bronze)
    assert global_by_id["p2r1"] == 3
    assert global_by_id["p2f"] == 3
    assert global_by_id["p1r1"] == 1
    assert global_by_id["p1f"] == 1
    assert global_by_id["p3r1"] == 2


def test_annotate_sets_is_dual_and_global_pos():
    rows = [
        _row(id="p1r1", round_type_id="1", person_id="P1", pos=1, best=50000),
        _row(id="p2r1", round_type_id="1", person_id="P2", pos=2, best=62600),
        _row(id="p1f", round_type_id="f", person_id="P1", pos=1, best=-1),
        _row(id="p2f", round_type_id="f", person_id="P2", pos=2, best=-1),
    ]
    annotated = annotate_dual_fields(rows)
    assert annotated["p2r1"] == (2, True)
    assert annotated["p2f"][1] is True
    assert annotated["p1r1"][1] is True


def test_extract_dual_pairs_from_wcif():
    wcif = {
        "events": [
            {
                "id": "555bf",
                "rounds": [
                    {
                        "id": "555bf-r1",
                        "cutoff": None,
                        "linkedRounds": ["555bf-r1", "555bf-r2"],
                    },
                    {
                        "id": "555bf-r2",
                        "cutoff": None,
                        "linkedRounds": ["555bf-r1", "555bf-r2"],
                    },
                ],
            }
        ]
    }
    pairs = extract_dual_pairs_from_wcif(wcif)
    assert pairs[("555bf", "1")] == frozenset({"1", "f"})
    assert pairs[("555bf", "f")] == frozenset({"1", "f"})
