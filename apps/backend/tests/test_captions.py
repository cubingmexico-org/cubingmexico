import json
import os
from datetime import date
from pathlib import Path

import pytest

from social.poster import (
    build_mollerz_caption,
    build_nemesis_caption,
    build_record_caption,
    build_resultados_caption,
    build_streaks_monthly_caption,
    build_summary_unlock_caption,
    build_upcoming_caption,
    build_weekly_digest_caption,
    build_year_recap_caption,
    parse_summary_unlock_year,
)

SNAPSHOT = Path(__file__).parent / "snapshots" / "captions.json"

WEEKLY_PAYLOAD = {
    "week_key": "2026-W38",
    "competition_week_label": "15–21 de septiembre",
    "primary_comps": [
        {"id": "PueblaOpen2026", "name": "Puebla Open 2026", "has_results": True},
        {"id": "CDMXCubea2026", "name": "CDMX Cubea 2026", "has_results": False},
    ],
    "late_comps": [{"id": "MonterreyFest2026", "name": "Monterrey Fest 2026"}],
    "record_counts": {"wr": 0, "nar": 1, "nr": 2},
    "sr_total": 7,
    "podium_count": 30,
    "debut_count": 12,
    "record_highlights": [
        {"level": "NAR", "event_name": "3x3x3", "kind": "single", "person_name": "Ana Pérez"},
    ],
    "sr_by_state": [{"state_name": "Puebla", "count": 4}, {"state_name": "Jalisco", "count": 3}],
    "upcoming_comps": [{"id": "OaxacaOpen2026", "name": "Oaxaca Open 2026"}],
}

YEAR_RECAP_PAYLOAD = {
    "year": 2025,
    "comp_count": 80,
    "state_count": 25,
    "competitor_count": 4321,
    "debut_count": 1500,
    "record_counts": {"wr": 1, "nar": 5, "nr": 40},
    "sr_total": 2100,
    "podium_count": 3000,
    "record_highlights": [{"level": "WR", "event_name": "Pyraminx", "person_name": "Luis López"}],
    "top_states": [{"state_name": "CDMX", "count": 20}, {"state_name": "Jalisco", "count": 10}],
}

STREAKS_PAYLOAD = {
    "month_key": "2026-09",
    "month_label": "septiembre 2026",
    "top_current": [
        {"person_name": "Ana Pérez", "state_name": "Puebla", "current_streak": 9},
        {"person_name": "Luis López", "state_name": "", "current_streak": 7},
    ],
}

CASES = {
    "resultados": lambda link: build_resultados_caption(
        competition_name="Puebla Open 2026", competition_id="PueblaOpen2026", include_link=link
    ),
    "resultados_no_name": lambda link: build_resultados_caption(
        competition_name="  ", competition_id="PueblaOpen2026", include_link=link
    ),
    "record": lambda link: build_record_caption(
        person_name="Ana Pérez",
        person_id="2015PERE01",
        event_name="3x3x3",
        kind="single",
        level="nr",
        time_text="5.12",
        state_name="Puebla",
        competition_name="Puebla Open 2026",
        competition_start_date=date(2026, 9, 13),
        competition_city_name="Puebla, Puebla",
        include_link=link,
    ),
    "record_minimal": lambda link: build_record_caption(
        person_name="",
        person_id="2015PERE01",
        event_name="",
        kind="average",
        level="XX",
        time_text="1:02.34",
        include_link=link,
    ),
    "upcoming": lambda link: build_upcoming_caption(
        competition_name="Oaxaca Open 2026",
        competition_id="OaxacaOpen2026",
        start_date=date(2026, 10, 10),
        end_date=date(2026, 10, 11),
        city_name="Oaxaca",
        state_name="Oaxaca",
        entry_fee="$350 MXN",
        registration_open_text="1 de septiembre",
        registration_close_text="5 de octubre",
        event_names=["3x3x3", "2x2x2"],
        competitor_limit=120,
        include_link=link,
    ),
    "summary_unlock": lambda link: build_summary_unlock_caption(year=2025, include_link=link),
    "weekly_digest": lambda link: build_weekly_digest_caption(WEEKLY_PAYLOAD, include_link=link),
    "streaks_monthly": lambda link: build_streaks_monthly_caption(STREAKS_PAYLOAD, include_link=link),
    "year_recap": lambda link: build_year_recap_caption(YEAR_RECAP_PAYLOAD, include_link=link),
    "mollerz_new": lambda link: build_mollerz_caption(
        person_name="Ana Pérez",
        person_id="2015PERE01",
        tier="Bronce",
        is_new_member=True,
        state_name="Puebla",
        include_link=link,
    ),
    "mollerz_tier_up": lambda link: build_mollerz_caption(
        person_name="Ana Pérez", person_id="2015PERE01", tier="Oro", is_new_member=False, include_link=link
    ),
    "nemesis": lambda link: build_nemesis_caption(
        person_name="Ana Pérez",
        person_id="2015PERE01",
        event_count=17,
        nemesized_count=1234,
        state_name="Puebla",
        include_link=link,
    ),
    "nemesis_single": lambda link: build_nemesis_caption(
        person_name="Ana Pérez", person_id="2015PERE01", event_count=3, nemesized_count=1, include_link=link
    ),
}


def _render_all():
    return {f"{name}:{'fb' if link else 'ig'}": fn(link) for name, fn in CASES.items() for link in (True, False)}


def test_captions_match_snapshot():
    current = _render_all()
    if os.environ.get("UPDATE_SNAPSHOTS") == "1" or not SNAPSHOT.exists():
        SNAPSHOT.parent.mkdir(exist_ok=True)
        SNAPSHOT.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n")
    assert current == json.loads(SNAPSHOT.read_text())


@pytest.mark.parametrize("name", list(CASES))
def test_instagram_caption_has_no_links(name):
    assert "https://" not in CASES[name](False)


def test_resultados_caption_links_to_podiums():
    caption = CASES["resultados"](True)
    assert caption.startswith("Resultados de Puebla Open 2026 ya disponibles")
    assert "https://cubingmexico.net/competitions/PueblaOpen2026/results/podiums" in caption


def test_resultados_caption_falls_back_to_id():
    assert CASES["resultados_no_name"](True).startswith("Resultados de PueblaOpen2026 ")


def test_record_caption_labels():
    caption = CASES["record"](True)
    assert caption.startswith("Ana Pérez de Puebla establece un nuevo récord nacional en 3x3x3 (single)")
    assert "https://cubingmexico.net/persons/2015PERE01" in caption
    assert CASES["record_minimal"](False).startswith("Un competidor establece un nuevo récord en su evento (average)")


def test_nemesis_caption_pluralization():
    assert "1,234 competidores lo tienen como némesis." in CASES["nemesis"](True)
    assert "1 competidor lo tiene como némesis." in CASES["nemesis_single"](True)


def test_weekly_digest_caption_stats_line():
    assert "En números: 1 NAR · 2 NR · 7 SR · 30 podios · 12 debutantes" in CASES["weekly_digest"](True)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [("2025", 2025), (2000, 2000), (2100, 2100), ("1999", None), ("2101", None), ("abc", None), (None, None)],
)
def test_parse_summary_unlock_year(raw, expected):
    assert parse_summary_unlock_year(raw) == expected
