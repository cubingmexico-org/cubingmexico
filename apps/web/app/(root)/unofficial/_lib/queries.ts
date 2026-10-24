"use cache";

import "server-only";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { CcEventFormat, CcEventOption } from "@/lib/cubing-contests";
import { loadCcCompetitors } from "@/lib/cubing-contests-queries";
import {
  countCcRankingStates,
  filterCcRanking,
  pickCcRecords,
  type CcRankType,
  type CcRankingFilters,
  type CcRankingRow,
  type CcRecordRow,
} from "./ranking";

/** Unofficial events where at least one Mexican competitor has a result. */
export async function getCcRankingEvents(): Promise<CcEventOption[]> {
  cacheLife("days");
  cacheTag("cc-results", "cc-ranking-events");

  const rows = (await db.execute(sql`
    SELECT e.id, e.name, e.format, e.participants
    FROM cc_events e
    WHERE EXISTS (
      SELECT 1
      FROM cc_results r
      JOIN cc_result_persons rp ON rp.result_id = r.id
      JOIN cc_persons p ON p.id = rp.person_id
      WHERE r.event_id = e.id AND p.region_code = 'MX'
    )
    ORDER BY e.rank, e.id
  `)) as unknown as {
    id: string;
    name: string;
    format: string;
    participants: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    format: row.format as CcEventFormat,
    participants: Number(row.participants),
  }));
}

/**
 * Best result per competitor (or per team), counting only rows with at least
 * one Mexican member, ranked nationally with ties sharing a rank.
 */
export async function getCcEventRanking(
  eventId: string,
  rankType: CcRankType,
): Promise<CcRankingRow[]> {
  cacheLife("days");
  cacheTag("cc-results", `cc-ranking-${eventId}-${rankType}`);

  const valueColumn = rankType === "single" ? sql`r.best` : sql`r.average`;

  const rows = (await db.execute(sql`
    WITH result_teams AS (
      SELECT
        r.id AS result_id,
        ${valueColumn} AS value,
        r.competition_id,
        r.date,
        string_agg(rp.person_id::text, '-' ORDER BY rp.person_id) AS team_key,
        bool_or(p.region_code = 'MX') AS has_mexican
      FROM cc_results r
      JOIN cc_result_persons rp ON rp.result_id = r.id
      JOIN cc_persons p ON p.id = rp.person_id
      WHERE r.event_id = ${eventId} AND ${valueColumn} > 0
      GROUP BY r.id
    ),
    best_per_team AS (
      SELECT DISTINCT ON (team_key) *
      FROM result_teams
      WHERE has_mexican
      ORDER BY team_key, value, date, result_id
    )
    SELECT
      b.team_key AS "key",
      b.value,
      b.result_id AS "resultId",
      b.competition_id AS "competitionId",
      c.name AS "competitionName",
      b.date,
      rank() OVER (ORDER BY b.value) AS "countryRank"
    FROM best_per_team b
    JOIN competitions c ON c.id = b.competition_id
    ORDER BY b.value, b.date, b.team_key
  `)) as unknown as {
    key: string;
    value: number;
    resultId: number;
    competitionId: string;
    competitionName: string;
    date: Date | string;
    countryRank: number | string;
  }[];

  const competitors = await loadCcCompetitors(rows.map((row) => row.resultId));
  return rows.map((row) => ({
    key: row.key,
    countryRank: Number(row.countryRank),
    stateRank: null,
    value: Number(row.value),
    resultId: Number(row.resultId),
    competitionId: row.competitionId,
    competitionName: row.competitionName,
    date: new Date(row.date),
    competitors: competitors.get(Number(row.resultId)) ?? [],
  }));
}

export async function getCcRankingPage(
  input: CcRankingFilters,
  eventId: string,
  rankType: CcRankType,
) {
  const rows = await getCcEventRanking(eventId, rankType);
  return filterCcRanking(rows, input);
}

export async function getCcRankingStateCounts(
  eventId: string,
  rankType: CcRankType,
) {
  const rows = await getCcEventRanking(eventId, rankType);
  return countCcRankingStates(rows);
}

/**
 * Current national records, or a state's records when `stateName` is set.
 * Tied holders are all returned.
 */
export async function getCcRecords(input: {
  state: string;
  event: string;
}): Promise<CcRecordRow[]> {
  const events = await getCcRankingEvents();
  const selected = input.event
    ? events.filter((event) => event.id === input.event)
    : events;

  const perEvent = await Promise.all(
    selected.map(async (event) => {
      const [singles, averages] = await Promise.all([
        getCcEventRanking(event.id, "single"),
        getCcEventRanking(event.id, "average"),
      ]);
      const toRecord =
        (type: CcRankType) =>
        (row: CcRankingRow): CcRecordRow => ({
          key: row.key,
          countryRank: row.countryRank,
          value: row.value,
          resultId: row.resultId,
          competitionId: row.competitionId,
          competitionName: row.competitionName,
          date: row.date,
          competitors: row.competitors,
          eventId: event.id,
          eventName: event.name,
          eventFormat: event.format,
          type,
        });
      return [
        ...pickCcRecords(singles, input.state).map(toRecord("single")),
        ...pickCcRecords(averages, input.state).map(toRecord("average")),
      ];
    }),
  );
  return perEvent.flat();
}
