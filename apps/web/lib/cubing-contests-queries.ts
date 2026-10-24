import "server-only";
import { db } from "@workspace/db";
import {
  ccEvent,
  ccPerson,
  ccResult,
  ccResultPerson,
  competition,
  person,
  state,
} from "@workspace/db/schema";
import {
  and,
  asc,
  eq,
  gte,
  inArray,
  lt,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  computeCcRecordMarkers,
  type CcRecordHistoryEntry,
  type CcRecordMarkers,
} from "@/lib/cubing-contests-records";
import {
  summarizeCcYear,
  type CcCompetitor,
  type CcEventFormat,
  type CcEventResultsGroup,
  type CcResultRow,
  type CcYearSummary,
} from "@/lib/cubing-contests";
import { roundRank } from "@/lib/utils";

export async function loadCcCompetitors(
  resultIds: number[],
): Promise<Map<number, CcCompetitor[]>> {
  const byResult = new Map<number, CcCompetitor[]>();
  if (resultIds.length === 0) return byResult;

  const rows = await db
    .select({
      resultId: ccResultPerson.resultId,
      ccPersonId: ccPerson.id,
      name: ccPerson.name,
      wcaId: person.wcaId,
      stateName: state.name,
    })
    .from(ccResultPerson)
    .innerJoin(ccPerson, eq(ccResultPerson.personId, ccPerson.id))
    .leftJoin(person, eq(ccPerson.wcaId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(inArray(ccResultPerson.resultId, resultIds))
    .orderBy(ccResultPerson.resultId, ccResultPerson.position);

  for (const { resultId, ...competitor } of rows) {
    const list = byResult.get(resultId) ?? [];
    list.push(competitor);
    byResult.set(resultId, list);
  }
  return byResult;
}

/** Results matching `where`, with their event, competition and competitors. */
export async function getCcResultRows(where: SQL): Promise<CcResultRow[]> {
  const rows = await db
    .select({
      resultId: ccResult.id,
      eventId: ccResult.eventId,
      eventName: ccEvent.name,
      eventFormat: ccEvent.format,
      competitionId: ccResult.competitionId,
      competitionName: competition.name,
      date: ccResult.date,
      roundTypeId: ccResult.roundTypeId,
      roundNumber: ccResult.roundNumber,
      formatId: ccResult.formatId,
      position: ccResult.pos,
      best: ccResult.best,
      average: ccResult.average,
      attempts: ccResult.attempts,
    })
    .from(ccResult)
    .innerJoin(ccEvent, eq(ccResult.eventId, ccEvent.id))
    .innerJoin(competition, eq(ccResult.competitionId, competition.id))
    .where(where)
    .orderBy(asc(ccEvent.rank), asc(ccResult.date), asc(ccResult.pos));

  const [competitors, { markers }] = await Promise.all([
    loadCcCompetitors(rows.map((r) => r.resultId)),
    getCcRecordMarkers(),
  ]);
  return rows.map((row) => ({
    ...row,
    eventFormat: row.eventFormat as CcEventFormat,
    singleRecord: markers[row.resultId]?.single ?? null,
    averageRecord: markers[row.resultId]?.average ?? null,
    competitors: competitors.get(row.resultId) ?? [],
  }));
}

/**
 * UNR/USR markers for every result, keyed by result id, plus each national and
 * state record progression. Computed over the whole (small) `cc_*` dataset.
 */
export async function getCcRecordMarkers(): Promise<{
  markers: Record<number, CcRecordMarkers>;
  history: CcRecordHistoryEntry[];
}> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", "cc-record-markers");

  const rows = (await db.execute(sql`
    SELECT
      r.id AS "resultId",
      r.event_id AS "eventId",
      r.date,
      r.best,
      r.average,
      bool_or(p.region_code = 'MX') AS "hasMexican",
      array_remove(array_agg(DISTINCT s.name), NULL) AS "stateNames"
    FROM cc_results r
    JOIN cc_result_persons rp ON rp.result_id = r.id
    JOIN cc_persons p ON p.id = rp.person_id
    LEFT JOIN persons wp ON wp.wca_id = p.wca_id
    LEFT JOIN states s ON s.id = wp.state_id
    GROUP BY r.id
  `)) as unknown as {
    resultId: number;
    eventId: string;
    date: Date | string;
    best: number;
    average: number;
    hasMexican: boolean | null;
    stateNames: string[] | null;
  }[];

  const { markers, history } = computeCcRecordMarkers(
    rows.map((row) => ({
      resultId: Number(row.resultId),
      eventId: row.eventId,
      date: row.date,
      best: Number(row.best),
      average: Number(row.average),
      hasMexican: row.hasMexican === true,
      stateNames: row.stateNames ?? [],
    })),
  );
  return { markers: Object.fromEntries(markers), history };
}

/** Keeps the incoming event order; sorts each event's rows by round, then position. */
export function groupCcResultsByEvent(
  rows: CcResultRow[],
): CcEventResultsGroup[] {
  const groups = new Map<string, CcEventResultsGroup>();
  for (const row of rows) {
    const group = groups.get(row.eventId) ?? {
      eventId: row.eventId,
      eventName: row.eventName,
      eventFormat: row.eventFormat,
      results: [],
    };
    group.results.push(row);
    groups.set(row.eventId, group);
  }
  return Array.from(groups.values());
}

/** Subquery of result ids with at least one member of the state's team (`persons.state_id`). */
export function teamMemberCcResultIds(stateId: string) {
  return db
    .select({ resultId: ccResultPerson.resultId })
    .from(ccResultPerson)
    .innerJoin(ccPerson, eq(ccResultPerson.personId, ccPerson.id))
    .innerJoin(person, eq(ccPerson.wcaId, person.wcaId))
    .where(eq(person.stateId, stateId));
}

/**
 * Summary of the results whose ids `resultIds` selects, limited to the calendar
 * year (UTC) when `year` is given.
 */
export async function getCcResultsSummary(
  resultIds: SQLWrapper,
  year?: number,
): Promise<CcYearSummary> {
  const rows = await db
    .select({
      eventId: ccResult.eventId,
      eventName: ccEvent.name,
      competitionId: ccResult.competitionId,
      roundTypeId: ccResult.roundTypeId,
      position: ccResult.pos,
      best: ccResult.best,
    })
    .from(ccResult)
    .innerJoin(ccEvent, eq(ccResult.eventId, ccEvent.id))
    .where(
      and(
        inArray(ccResult.id, resultIds),
        year === undefined
          ? undefined
          : gte(ccResult.date, new Date(Date.UTC(year, 0, 1))),
        year === undefined
          ? undefined
          : lt(ccResult.date, new Date(Date.UTC(year + 1, 0, 1))),
      ),
    )
    .orderBy(asc(ccEvent.rank), asc(ccResult.date));
  return summarizeCcYear(rows);
}

export function sortCcRowsByRound(rows: CcResultRow[]): CcResultRow[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        roundRank(a.roundTypeId) - roundRank(b.roundTypeId) ||
        b.roundNumber - a.roundNumber ||
        (a.position ?? 999) - (b.position ?? 999),
    );
}
