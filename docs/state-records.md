# State records (SR) and WCA alignment

This document explains how Cubing México determines **state records (SR)**, how that relates to the WCA Regulations (in particular **9i2**), and what is still missing to match the full behavior of WCA regional records.

Relevant code:

- Web: [`apps/web/lib/update-state-records.ts`](../apps/web/lib/update-state-records.ts)
- Backend (global recompute / cron): [`apps/backend/routes/admin/state.py`](../apps/backend/routes/admin/state.py) (`update_state_records`)
- Round dates (WCIF / manual): `competition_round_dates` table; extractor [`apps/web/lib/competition-round-dates.ts`](../apps/web/lib/competition-round-dates.ts)
- History (read): [`apps/web/app/(root)/records/_lib/queries.ts`](<../apps/web/app/(root)/records/_lib/queries.ts>) (`getRecordHistory`)

---

## Marker hierarchy (as in the WCA)

In the WCA, each result stores **a single** regional marker in `regional_single_record` / `regional_average_record`. If a time is a world record, it is tagged only as `WR`; it is not also stored as `NAR` or `NR`.

The logic in the WCA code (`CheckRegionalRecords.compute_record_marker`) escalates the tag:

1. If it ties or beats the national record → `NR`
2. If it also ties or beats the continental record → e.g. `NAR`
3. If it also ties or beats the world record → `WR`

Cubing México adds one level below:

**WR > NAR > NR > SR**

If the result already carries `NR`, `NAR`, or `WR` from the WCA, we do **not** write `SR` to `state_single_record` / `state_average_record`. The time still updates the state's "best so far", so a later, worse result is not mistakenly marked as SR.

The state records **history view** does include those `NR`/`NAR`/`WR` results from state members (just as the WCA includes WR/CR in the national history: any regional marker counts). The markers stored in `state_*` remain exclusive.

---

## WCA Regulation 9i2

Relevant text (official regulations):

> All results from a round are considered to have occurred on the **last calendar date of that round**, according to the local time of the competition venue. If a regional record is achieved **multiple times on the same calendar date**, **only the best** is recognized as breaking that record.

Implications:

- It is not a "24-hour" window but the **same calendar day**.
- A result's date is not necessarily the day it was solved on stage, but the **last scheduled day of that round**.
- In a multi-day competition, a Saturday first round and a Sunday final can produce separate records (different days). Two improvements on the same Saturday only count the best one.

Source: [WCA Regulations — 9i](https://www.worldcubeassociation.org/regulations/#9i).  
WCA reference implementation: [`lib/check_regional_records.rb`](https://github.com/thewca/worldcubeassociation.org/blob/main/lib/check_regional_records.rb).

---

## How SR works in Cubing México today

1. Take the people whose `persons.state_id` = current state.
2. Clear their `state_*_record` markers.
3. For each event (except excluded events), load valid singles and averages, ordered by:
   - 9i2 effective date: `COALESCE(competition_round_dates.end_date, competitions.start_date)`
   - `competitions.id`
   - round type rank
   - time (best first)
   - `results.id`
4. Walk the results chronologically with a running best (`bestSoFar`).
5. Group results by **day = that effective date** (date only).
6. Within each day, among results that tie or beat `bestSoFar`, only those that tie the **best value of that day** are tagged `SR`, and only if they don't already have `NR`/`NAR`/`WR`.
7. `bestSoFar` moves to that day's best (even if all of them were demoted because of a regional marker).

Important properties:

- Attribution is **retroactive to the competitor's current state** (not the state they belonged to on the competition date).
- Ties on the day's best time (same value) can all receive `SR`, except those that are already regional records.

### Round dates (`competition_round_dates`)

To match 9i2, we persist, per competition / event / `round_type_id`, the **local calendar end date of that round**:

- **Automatic (cron / admin):** any competition that **already has results** in Neon (Mexican competitors, in Mexico or abroad) and has no schedule rows yet. The public WCIF is read, round activities are extracted (`startTime`/`endTime` + venue timezone), and mapped to `round_type_id`. The cron processes a bounded batch and **does not overwrite** a competition that was already imported. It also never overwrites rows with `source = 'manual'`.
- **Manual (admin):** `/admin/schedules` for competitions without an available WCIF (e.g. historical foreign competitions); dates are entered for the rounds present in `results`. Mexican competitions can also be edited from `/admin/competitions`.
- **Fallback:** if there is no row for a round, `competitions.start_date` is used (the previous behavior).

---

## What already matches the WCA

| Behavior                           | WCA                         | Cubing México (SR)                                                 |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| Only the highest marker            | WR / NAR / NR in one column | No SR if there is already NR/NAR/WR                                |
| Tie with the current record (`<=`) | Yes                         | Yes                                                                |
| Same calendar day → only the best  | 9i2                         | Yes                                                                |
| Day = last local day of the round  | 9i2                         | Yes, when `competition_round_dates` exists; otherwise `start_date` |
| Running historical best over time  | Yes                         | Yes                                                                |

---

## What is missing for full WCA behavior

### 1. Schedule coverage

Without a row in `competition_round_dates` (old competitions without WCIF, or ones pending import/entry), the day is still `start_date`. The `/admin/schedules` panel, the "Sin horario" (no schedule) filter on Mexican competitions, and the `/update-competition-schedules` job help close that gap, **including foreign competitions** where a Mexican competitor has results.

### 2. Overlapping competitions

The WCA, in `CheckRegionalRecords.confirm_records`, does not "confirm" a competition's record until the next one starts **after** the previous one's `end_date` (`next_start > prev_end`). This avoids inconsistencies when two competitions overlap on the same weekend.

We collapse by the shared 9i2 effective date; we don't implement that queue of pending competitions with `start`–`end` ranges.

---

## Summary

Cubing México's SR follows the WCA **marker hierarchy** and **9i2** (same day → only the best), using the **local end of the round** as the day when it is in `competition_round_dates`, or `start_date` as a fallback. Still pending: the official checker's **overlapping competitions** logic, and filling in missing schedules (mostly competitions without WCIF).
