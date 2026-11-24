"""Unit tests for Dual Round global_pos computation."""

from routes.admin.dual_rounds import (
    annotate_dual_fields,
    competition_ids_needing_wcif,
    compute_global_positions,
    detect_dual_pair_types,
    dual_rounds_eligible,
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


def test_extract_dual_pairs_from_null_advancement_condition():
    """Public WCIF often omits linkedRounds; null advancement on r1 marks Dual."""
    wcif = {
        "events": [
            {
                "id": "555bf",
                "rounds": [
                    {
                        "id": "555bf-r1",
                        "cutoff": None,
                        "advancementCondition": None,
                        "linkedRounds": None,
                    },
                    {
                        "id": "555bf-r2",
                        "cutoff": None,
                        "advancementCondition": None,
                        "linkedRounds": None,
                    },
                ],
            },
            {
                "id": "444",
                "rounds": [
                    {
                        "id": "444-r1",
                        "cutoff": None,
                        "advancementCondition": {"type": "ranking", "level": 5},
                    },
                    {
                        "id": "444-r2",
                        "cutoff": None,
                        "advancementCondition": None,
                    },
                ],
            },
        ]
    }
    pairs = extract_dual_pairs_from_wcif(wcif)
    assert pairs[("555bf", "1")] == frozenset({"1", "f"})
    assert pairs[("555bf", "f")] == frozenset({"1", "f"})
    assert ("444", "1") not in pairs
    assert ("444", "f") not in pairs


def _los_fuertes_555bf_rows():
    """Production-shaped Mexican rows: skippers in either dual round."""
    return [
        _row(id="r1-ocar", round_type_id="1", person_id="2023OCAR01", pos=1, best=43421),
        _row(id="r1-sala", round_type_id="1", person_id="2014SALA15", pos=2, best=62600),
        _row(id="r1-toro", round_type_id="1", person_id="2016TORO03", pos=3, best=-1),
        _row(id="r1-pime", round_type_id="1", person_id="2023PIME02", pos=3, best=-1),
        _row(id="r1-sori", round_type_id="1", person_id="2014SORI01", pos=3, best=-1),
        _row(id="r1-mend", round_type_id="1", person_id="2017MEND12", pos=3, best=-1),
        _row(id="r1-pere", round_type_id="1", person_id="2018PERE05", pos=3, best=-1),
        _row(id="r1-pera", round_type_id="1", person_id="2024PERA04", pos=3, best=-1),
        _row(id="f-pera", round_type_id="f", person_id="2024PERA04", pos=1, best=59356),
        _row(id="f-toro", round_type_id="f", person_id="2016TORO03", pos=2, best=166600),
        _row(id="f-sala", round_type_id="f", person_id="2014SALA15", pos=3, best=-1),
        _row(id="f-pime", round_type_id="f", person_id="2023PIME02", pos=3, best=-1),
        _row(id="f-cabr", round_type_id="f", person_id="2019CABR09", pos=3, best=-1),
        _row(id="f-ocar", round_type_id="f", person_id="2023OCAR01", pos=3, best=-1),
    ]


def test_detect_los_fuertes_555bf_skippers_need_wcif():
    """8 first / 6 final / overlap 5 — results-only overlap must not guess Dual."""
    assert detect_dual_pair_types(_los_fuertes_555bf_rows()) is None


def test_annotate_los_fuertes_toro_global_pos_is_4_with_wcif():
    """Local final place 2 must not become silver; combined dual rank is 4."""
    rows = _los_fuertes_555bf_rows()
    wcif_pairs = {
        "LosFuertesV3Puebla2026": {
            ("555bf", "1"): frozenset({"1", "f"}),
            ("555bf", "f"): frozenset({"1", "f"}),
        }
    }
    annotated = annotate_dual_fields(
        rows,
        wcif_pairs_by_competition=wcif_pairs,
        allow_overlap_heuristic=False,
    )
    assert annotated["f-toro"] == (4, True)
    assert annotated["r1-toro"] == (4, True)
    assert annotated["f-pera"][0] == 2
    assert annotated["r1-ocar"][0] == 1


def test_pre_2026_competitions_never_dual():
    """Dual Rounds launched in 2026 — perfect overlap must not mark older comps."""
    assert dual_rounds_eligible("Fenix2014") is False
    assert dual_rounds_eligible("LosFuertesV3Puebla2026") is True
    rows = [
        _row(
            id="a1",
            competition_id="Fenix2014",
            event_id="333",
            round_type_id="1",
            person_id="P1",
            pos=1,
            best=1000,
        ),
        _row(
            id="a2",
            competition_id="Fenix2014",
            event_id="333",
            round_type_id="1",
            person_id="P2",
            pos=2,
            best=1100,
        ),
        _row(
            id="b1",
            competition_id="Fenix2014",
            event_id="333",
            round_type_id="f",
            person_id="P1",
            pos=1,
            best=900,
        ),
        _row(
            id="b2",
            competition_id="Fenix2014",
            event_id="333",
            round_type_id="f",
            person_id="P2",
            pos=2,
            best=950,
        ),
    ]
    assert detect_dual_pair_types(rows) is None
    annotated = annotate_dual_fields(rows)
    assert annotated["b1"] == (1, False)
    assert annotated["a1"] == (1, False)
    assert competition_ids_needing_wcif(rows) == set()


def test_backfill_skips_overlap_heuristic_without_wcif():
    """Mexican-only backfill must not invent duals from person overlap alone."""
    rows = [
        _row(id="a1", round_type_id="1", person_id="P1", pos=1, best=60000),
        _row(id="a2", round_type_id="1", person_id="P2", pos=2, best=61000),
        _row(id="b1", round_type_id="f", person_id="P1", pos=2, best=-1),
        _row(id="b2", round_type_id="f", person_id="P2", pos=1, best=59000),
    ]
    annotated = annotate_dual_fields(rows, allow_overlap_heuristic=False)
    assert annotated["b2"] == (1, False)
    assert annotated["a1"] == (1, False)
