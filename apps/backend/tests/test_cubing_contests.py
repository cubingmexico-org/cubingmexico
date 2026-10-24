from datetime import datetime

from routes.admin.cubing_contests import candidate_competition_ids, read_cc_csv, select_cc_rows

CONTESTS = read_cc_csv(
    "competition_id,type,state,region_code\n"
    "MexOpen2025,wca-comp,published,MX\n"
    "Euro2026,wca-comp,published,FR\n"
    "MeetupMX,meetup,published,MX\n"
    "CcOnlyMX,comp,published,MX\n"
    "DraftMX,wca-comp,approved,MX\n"
    "NewMX2026,wca-comp,published,MX\n"
)
PERSONS = read_cc_csv(
    "id,name,region_code,wca_id\n1,Ana MX,MX,2019ANAM01\n2,Bob FR,FR,2018BOBF01\n3,Carla MX,MX,__EMPTY_STRING__\n"
)
EVENTS = read_cc_csv(
    "event_id,name,format,rank,participants,default_round_format\n"
    "fto,Face-Turning Octahedron,time,1010,1,a\n"
    "333_team_bld,3x3x3 Team-Blind,time,1020,2,a\n"
    "333,3x3x3 Cube,time,10,1,a\n"
)
ROUNDS = read_cc_csv(
    "id,competition_id,event_id,round_number,round_type_id,format\n"
    "10,MexOpen2025,fto,1,f,a\n"
    "11,Euro2026,333_team_bld,1,f,a\n"
)
RESULT_HEADER = "id,event_id,date,approved,person_ids,attempts,best,average,competition_id,round_id,ranking\n"
ATTEMPTS = '"[{""result"":4380},{""result"":4810},{""result"":4271}]"'


def _result(rid, event_id, person_ids, competition_id, approved="TRUE", round_id="10"):
    return (
        f'{rid},{event_id},2025-08-18T00:00:00.000Z,{approved},"{person_ids}",{ATTEMPTS},'
        f"4271,4487,{competition_id},{round_id},1\n"
    )


def _select(rows, competition_ids=None, official_event_ids=frozenset({"333"})):
    results = read_cc_csv(RESULT_HEADER + "".join(rows))
    if competition_ids is None:
        competition_ids = {"MexOpen2025", "Euro2026", "MeetupMX", "CcOnlyMX", "DraftMX"}
    return select_cc_rows(CONTESTS, PERSONS, EVENTS, ROUNDS, results, competition_ids, official_event_ids)


def test_candidate_competition_ids_only_published_wca_comps():
    assert candidate_competition_ids(CONTESTS) == {"MexOpen2025", "Euro2026", "NewMX2026"}


def test_keeps_result_at_mexican_wca_competition():
    out = _select([_result(1, "fto", "[2]", "MexOpen2025")])
    assert out["results"] == [
        (1, "MexOpen2025", "fto", "f", 1, "a", 1, 4271, 4487, [4380, 4810, 4271], datetime(2025, 8, 18))
    ]
    assert out["result_persons"] == [(1, 2, 0)]
    assert out["persons"] == [(2, "Bob FR", "FR", "2018BOBF01")]
    assert out["events"] == [("fto", "Face-Turning Octahedron", "time", 1010, 1)]


def test_excludes_meetups_cc_only_and_unpublished_contests():
    out = _select(
        [
            _result(1, "fto", "[1]", "MeetupMX"),
            _result(2, "fto", "[1]", "CcOnlyMX"),
            _result(3, "fto", "[1]", "DraftMX"),
        ]
    )
    assert out["results"] == []


def test_mexican_abroad_included_foreigners_abroad_excluded():
    out = _select([_result(1, "fto", "[1]", "Euro2026"), _result(2, "fto", "[2]", "Euro2026")])
    assert [r[0] for r in out["results"]] == [1]


def test_team_result_with_one_mexican_member_included():
    out = _select([_result(1, "333_team_bld", "[2,3]", "Euro2026", round_id="11")])
    assert [r[0] for r in out["results"]] == [1]
    assert out["result_persons"] == [(1, 2, 0), (1, 3, 1)]
    assert out["persons"][1] == (3, "Carla MX", "MX", None)


def test_official_wca_event_dropped():
    out = _select([_result(1, "333", "[1]", "MexOpen2025")])
    assert out["results"] == []
    assert out["events"] == []


def test_unapproved_result_dropped():
    out = _select([_result(1, "fto", "[1]", "MexOpen2025", approved="FALSE")])
    assert out["results"] == []


def test_missing_competition_skipped_and_counted():
    out = _select([_result(1, "fto", "[1]", "NewMX2026")], competition_ids={"MexOpen2025"})
    assert out["results"] == []
    assert out["skipped_missing_competition"] == 1


def test_missing_round_falls_back_to_event_defaults():
    out = _select([_result(1, "fto", "[1]", "MexOpen2025", round_id="999")])
    assert out["results"][0][3:6] == (None, 1, "a")
