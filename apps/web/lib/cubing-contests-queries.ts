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
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
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

  const competitors = await loadCcCompetitors(rows.map((r) => r.resultId));
  return rows.map((row) => ({
    ...row,
    eventFormat: row.eventFormat as CcEventFormat,
    competitors: competitors.get(row.resultId) ?? [],
  }));
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

/**
 * Year summary of the results whose ids `resultIds` selects, dated within the
 * calendar year (UTC).
 */
export async function getCcYearSummary(
  resultIds: SQLWrapper,
  year: number,
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
        gte(ccResult.date, new Date(Date.UTC(year, 0, 1))),
        lt(ccResult.date, new Date(Date.UTC(year + 1, 0, 1))),
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
