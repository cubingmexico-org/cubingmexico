"""Detect Dual (linked) Rounds and compute WCA-style global_pos from results rows."""

from __future__ import annotations

import re
import time
from collections import defaultdict
from collections.abc import Iterable, Mapping, Sequence
from typing import Any

import requests

from common import log
from utils import parse_round_activity_code, round_type_id_from_wcif

_PUBLIC_WCIF_URL = "https://www.worldcubeassociation.org/api/v0/competitions/{competition_id}/wcif/public"
_WCIF_TIMEOUT_SECONDS = 30
_WCIF_REQUEST_GAP_SECONDS = 0.35
_WCIF_MAX_RETRIES = 3

# WCA Dual (linked) Rounds launched in 2026. Never treat earlier comps as dual.
DUAL_ROUNDS_START_YEAR = 2026
_COMPETITION_YEAR_RE = re.compile(r"(\d{4})$")

# Lower rank = earlier round. Mirrors WCA round_types.rank ordering for dual pairing.
_ROUND_TYPE_ORDER: dict[str, int] = {
    "0": 10,
    "h": 10,
    "1": 20,
    "d": 20,
    "2": 30,
    "e": 30,
    "3": 40,
    "g": 40,
    "b": 90,
    "f": 99,
    "c": 99,
}

_FINAL_ROUND_TYPES = frozenset({"f", "c"})

# Formats that rank by average (WCA formats.sort_by = 'average').
_AVERAGE_SORT_FORMATS = frozenset({"a", "m"})

# Results-only fallback when WCIF is unavailable.
# Dual rounds have no elimination; require near-full overlap both ways. Skipper-heavy
# duals (common in BLD) are detected via WCIF null advancement / linkedRounds instead.
# Mexican-only result sets can make later rounds look larger than earlier ones, so a
# looser "later coverage" heuristic false-positives normal multi-round events.
_OVERLAP_THRESHOLD = 0.9


def round_type_order(round_type_id: str | None) -> int:
    if not round_type_id:
        return 50
    return _ROUND_TYPE_ORDER.get(round_type_id, 50)


def is_final_round_type(round_type_id: str | None) -> bool:
    return round_type_id in _FINAL_ROUND_TYPES


def competition_year_from_id(competition_id: str | None) -> int | None:
    """Year suffix from a WCA competition id (e.g. LosFuertesV3Puebla2026 → 2026)."""
    if not competition_id:
        return None
    match = _COMPETITION_YEAR_RE.search(str(competition_id))
    return int(match.group(1)) if match else None


def dual_rounds_eligible(competition_id: str | None) -> bool:
    """True when Dual Rounds could exist for this competition (2026+)."""
    year = competition_year_from_id(competition_id)
    return year is not None and year >= DUAL_ROUNDS_START_YEAR


def _register_pair(
    pairs: dict[tuple[str, str], frozenset[str]],
    event_id: str,
    type_ids: frozenset[str],
    seen_groups: set[frozenset[str]],
) -> None:
    if len(type_ids) < 2 or type_ids in seen_groups:
        return
    seen_groups.add(type_ids)
    for rtype in type_ids:
        pairs[(event_id, rtype)] = type_ids


def extract_dual_pairs_from_wcif(wcif: Mapping[str, Any] | None) -> dict[tuple[str, str], frozenset[str]]:
    """Map (event_id, any_round_type_id_in_pair) -> frozenset of round_type_ids in the dual pair.

    Prefers explicit WCIF `linkedRounds`. When those are absent (common on public
    WCIF after the meet), treats Reg 9v1 duals as: first two rounds where the
    first round has no `advancementCondition` (no elimination).
    """
    if not wcif or not isinstance(wcif, Mapping):
        return {}

    pairs: dict[tuple[str, str], frozenset[str]] = {}
    for event in wcif.get("events") or []:
        event_id = event.get("id")
        rounds = event.get("rounds") or []
        total = len(rounds)
        if not event_id or total == 0:
            continue

        # (wcif_id, round_type_id, linked_ids, advancement_condition)
        round_meta: list[tuple[str, str, list[str] | None, Any]] = []
        for i, round_obj in enumerate(rounds):
            parsed = parse_round_activity_code(round_obj.get("id") or "")
            round_number = parsed[1] if parsed else i + 1
            has_cutoff = round_obj.get("cutoff") is not None
            round_type_id = round_type_id_from_wcif(round_number, total, has_cutoff)
            linked = round_obj.get("linkedRounds")
            linked_ids = list(linked) if isinstance(linked, list) and linked else None
            round_meta.append(
                (
                    round_obj.get("id") or "",
                    round_type_id,
                    linked_ids,
                    round_obj.get("advancementCondition"),
                )
            )

        id_to_type = {wcif_id: rtype for wcif_id, rtype, _, _ in round_meta if wcif_id}
        seen_groups: set[frozenset[str]] = set()

        for wcif_id, _round_type_id, linked_ids, _adv in round_meta:
            if not linked_ids:
                continue
            group_ids = {wcif_id, *linked_ids}
            type_ids = frozenset(id_to_type[rid] for rid in group_ids if rid in id_to_type)
            _register_pair(pairs, event_id, type_ids, seen_groups)

        # Fallback: null advancement on the first of 2+ rounds ⇒ Dual (Reg 9v1).
        if total >= 2 and not any(linked for _, _, linked, _ in round_meta if linked):
            first_round = round_meta[0]
            second_round = round_meta[1]
            if first_round[3] is None:
                type_ids = frozenset({first_round[1], second_round[1]})
                _register_pair(pairs, event_id, type_ids, seen_groups)

    return pairs


def _person_sets_by_round(
    rows: Sequence[Mapping[str, Any]],
) -> dict[str, set[str]]:
    by_round: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        rtype = row.get("round_type_id")
        person_id = row.get("person_id")
        if rtype and person_id:
            by_round[str(rtype)].add(str(person_id))
    return by_round


def competition_ids_needing_wcif(rows: Sequence[Mapping[str, Any]]) -> set[str]:
    """2026+ competitions that have any event with 2+ distinct round types."""
    rounds_by_comp_event: dict[tuple[str, str], set[str]] = defaultdict(set)
    for row in rows:
        comp_id = str(row.get("competition_id") or "")
        event_id = str(row.get("event_id") or "")
        rtype = row.get("round_type_id")
        if not dual_rounds_eligible(comp_id):
            continue
        if comp_id and event_id and rtype:
            rounds_by_comp_event[(comp_id, event_id)].add(str(rtype))
    return {comp_id for (comp_id, _event_id), rtypes in rounds_by_comp_event.items() if len(rtypes) >= 2}


def fetch_public_wcif(competition_id: str) -> Mapping[str, Any] | None:
    """Fetch public WCIF; returns None on 404 or request failure (soft-fail)."""
    url = _PUBLIC_WCIF_URL.format(competition_id=competition_id)
    for attempt in range(_WCIF_MAX_RETRIES):
        try:
            response = requests.get(url, timeout=_WCIF_TIMEOUT_SECONDS)
            if response.status_code == 404:
                return None
            if response.status_code == 429:
                retry_after = float(response.headers.get("Retry-After") or (2**attempt))
                time.sleep(min(retry_after, 30))
                continue
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, Mapping) else None
        except requests.RequestException as exc:
            if attempt + 1 >= _WCIF_MAX_RETRIES:
                log.warning("Failed to fetch public WCIF for %s: %s", competition_id, exc)
                return None
            time.sleep(2**attempt)
        except ValueError as exc:
            log.warning("Invalid JSON in public WCIF for %s: %s", competition_id, exc)
            return None
    log.warning("Failed to fetch public WCIF for %s after retries", competition_id)
    return None


def fetch_wcif_pairs_for_competitions(
    competition_ids: Iterable[str],
) -> dict[str, dict[tuple[str, str], frozenset[str]]]:
    """Map competition_id -> dual pairs from public WCIF. Soft-fails per competition."""
    unique_ids = sorted({str(cid) for cid in competition_ids if cid})
    out: dict[str, dict[tuple[str, str], frozenset[str]]] = {}
    for index, competition_id in enumerate(unique_ids):
        if index:
            time.sleep(_WCIF_REQUEST_GAP_SECONDS)
        wcif = fetch_public_wcif(competition_id)
        if not wcif:
            continue
        pairs = extract_dual_pairs_from_wcif(wcif)
        if pairs:
            out[competition_id] = pairs
    log.info(
        "Loaded WCIF dual pairs for %s/%s competitions.",
        len(out),
        len(unique_ids),
    )
    return out


def detect_dual_pair_types(
    rows_for_event: Sequence[Mapping[str, Any]],
    wcif_pairs: Mapping[tuple[str, str], frozenset[str]] | None = None,
    event_id: str | None = None,
    *,
    competition_id: str | None = None,
    allow_overlap_heuristic: bool = True,
) -> frozenset[str] | None:
    """Return the two round_type_ids that form a dual pair for this competition event, if any.

    Pre-2026 competitions never qualify. Prefer WCIF pairs; the person-overlap
    heuristic is optional (disable for Mexican-only backfills — it false-positives).
    """
    if competition_id is None and rows_for_event:
        competition_id = str(rows_for_event[0].get("competition_id") or "") or None
    if competition_id is not None and not dual_rounds_eligible(competition_id):
        return None

    if event_id and wcif_pairs:
        for row in rows_for_event:
            rtype = row.get("round_type_id")
            if not rtype:
                continue
            pair = wcif_pairs.get((event_id, str(rtype)))
            if pair and len(pair) >= 2:
                return pair

    if not allow_overlap_heuristic:
        return None

    by_round = _person_sets_by_round(rows_for_event)
    if len(by_round) < 2:
        return None

    ordered = sorted(by_round.keys(), key=round_type_order)
    # Dual is only the first two rounds of an event (Reg 9v1).
    first_two = ordered[:2]
    if len(first_two) < 2:
        return None

    a, b = first_two
    set_a, set_b = by_round[a], by_round[b]
    if not set_a or not set_b:
        return None

    overlap = len(set_a & set_b)
    smaller = min(len(set_a), len(set_b))
    larger = max(len(set_a), len(set_b))
    if larger == 0:
        return None
    # Near-full overlap in both directions signals no elimination between the rounds.
    if overlap / larger >= _OVERLAP_THRESHOLD and overlap / smaller >= _OVERLAP_THRESHOLD:
        return frozenset(first_two)
    return None


def _sort_key_for_result(row: Mapping[str, Any]) -> tuple:
    """WCA-style sort: failed primary last, then ascending primary, then secondary."""
    format_id = str(row.get("format_id") or "a")
    best = int(row.get("best") or 0)
    average = int(row.get("average") or 0)
    if format_id in _AVERAGE_SORT_FORMATS:
        primary, secondary = average, best
    else:
        primary, secondary = best, average
    return (primary <= 0, primary if primary > 0 else 0, secondary <= 0, secondary if secondary > 0 else 0)


def compute_global_positions(
    rows_for_event: Sequence[Mapping[str, Any]],
    dual_round_types: frozenset[str],
) -> dict[str, int]:
    """Map result id -> global_pos for rows in the dual pair; others omitted."""
    dual_rows = [row for row in rows_for_event if str(row.get("round_type_id") or "") in dual_round_types]
    by_person: dict[str, list[Mapping[str, Any]]] = defaultdict(list)
    for row in dual_rows:
        # Skip empty placeholders (best == 0 and average == 0), matching WCA live ranking.
        if int(row.get("best") or 0) == 0 and int(row.get("average") or 0) == 0:
            continue
        person_id = str(row.get("person_id") or "")
        if person_id:
            by_person[person_id].append(row)

    best_per_person: list[Mapping[str, Any]] = []
    for person_rows in by_person.values():
        best_per_person.append(min(person_rows, key=_sort_key_for_result))

    best_per_person.sort(key=_sort_key_for_result)

    # Dense rank with ties sharing the same global_pos (WCA RANK()-style).
    person_global: dict[str, int] = {}
    prev_key: tuple | None = None
    rank = 0
    for index, row in enumerate(best_per_person, start=1):
        key = _sort_key_for_result(row)
        if key != prev_key:
            rank = index
            prev_key = key
        person_global[str(row["person_id"])] = rank

    result_global: dict[str, int] = {}
    for row in dual_rows:
        person_id = str(row.get("person_id") or "")
        result_id = str(row.get("id") or "")
        if person_id in person_global and result_id:
            result_global[result_id] = person_global[person_id]
    return result_global


def annotate_dual_fields(
    all_rows: Sequence[Mapping[str, Any]],
    wcif_pairs_by_competition: Mapping[str, Mapping[tuple[str, str], frozenset[str]]] | None = None,
    *,
    allow_overlap_heuristic: bool = True,
) -> dict[str, tuple[int, bool]]:
    """
    For every result id, return (global_pos, is_dual).

    `all_rows` should include every competitor (all countries) for competitions that need
    accurate dual ranking. Non-dual rows get global_pos = pos.
    Pre-2026 competitions are never dual. Set `allow_overlap_heuristic=False` for
    Mexican-only backfills (use WCIF pairs only).
    """
    by_comp_event: dict[tuple[str, str], list[Mapping[str, Any]]] = defaultdict(list)
    for row in all_rows:
        comp_id = str(row.get("competition_id") or "")
        event_id = str(row.get("event_id") or "")
        if comp_id and event_id:
            by_comp_event[(comp_id, event_id)].append(row)

    annotated: dict[str, tuple[int, bool]] = {}

    for (comp_id, event_id), event_rows in by_comp_event.items():
        wcif_pairs = None
        if wcif_pairs_by_competition:
            wcif_pairs = wcif_pairs_by_competition.get(comp_id)
        dual_types = detect_dual_pair_types(
            event_rows,
            wcif_pairs,
            event_id,
            competition_id=comp_id,
            allow_overlap_heuristic=allow_overlap_heuristic,
        )

        global_by_id: dict[str, int] = {}
        if dual_types:
            global_by_id = compute_global_positions(event_rows, dual_types)

        for row in event_rows:
            result_id = str(row.get("id") or "")
            if not result_id:
                continue
            pos = int(row.get("pos") or 0)
            rtype = str(row.get("round_type_id") or "")
            if dual_types and rtype in dual_types:
                annotated[result_id] = (global_by_id.get(result_id, pos), True)
            else:
                annotated[result_id] = (pos, False)

    return annotated


def mexican_rows_with_dual(
    all_rows: Iterable[Mapping[str, Any]],
    mexican_country: str = "Mexico",
    wcif_pairs_by_competition: Mapping[str, Mapping[tuple[str, str], frozenset[str]]] | None = None,
) -> list[dict[str, Any]]:
    """Filter to Mexican competitors and attach global_pos / is_dual."""
    rows = list(all_rows)
    mexican_comp_ids = {
        str(row["competition_id"])
        for row in rows
        if row.get("person_country_id") == mexican_country and row.get("competition_id")
    }
    relevant = [row for row in rows if str(row.get("competition_id") or "") in mexican_comp_ids]
    annotated = annotate_dual_fields(relevant, wcif_pairs_by_competition)

    out: list[dict[str, Any]] = []
    for row in rows:
        if row.get("person_country_id") != mexican_country:
            continue
        result_id = str(row.get("id") or "")
        pos = int(row.get("pos") or 0) if not _is_na(row.get("pos")) else 0
        global_pos, is_dual = annotated.get(result_id, (pos, False))
        enriched = dict(row)
        enriched["pos"] = pos
        enriched["global_pos"] = global_pos
        enriched["is_dual"] = is_dual
        out.append(enriched)
    return out


def _is_na(value: Any) -> bool:
    if value is None:
        return True
    try:
        import pandas as pd

        return bool(pd.isna(value))
    except Exception:
        return False
