import { db } from "@workspace/db";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import {
  competition,
  competitionRoundDate,
  event,
  person,
  result,
  roundType,
  state,
} from "@workspace/db/schema";
import { EXCLUDED_EVENTS } from "@/lib/constants";

const SR = "SR";
const REGIONAL_RECORD_MARKERS = ["NR", "NAR", "WR"] as const;
const REGIONAL_RECORD_MARKER_SET = new Set<string>(REGIONAL_RECORD_MARKERS);

type StateRecordRow = {
  id: string;
  value: number;
  /** Effective 9i2 day: round local end date, else competition start_date */
  recordDate: Date | string;
  regionalRecord: string | null;
};

/** Clear historical SR tags for people leaving a state (or changing states). */
export async function clearPersonStateRecords(personIds: string[]) {
  if (personIds.length === 0) {
    return;
  }

  await db
    .update(result)
    .set({
      stateSingleRecord: null,
      stateAverageRecord: null,
    })
    .where(inArray(result.personId, personIds));
}

/**
 * Recompute historical state record markers for all current members of a state.
 * Attributes every past result to the person's current state_id (WCA-style running best).
 *
 * Same calendar day (round end date from schedule, else competition start_date) →
 * only the best improvement that day is tagged.
 * Results that already have NR/NAR/WR are not tagged SR, but still advance bestSoFar.
 */
export async function updateStateRecords(stateId: string) {
  const stateData = await db
    .select({ id: state.id })
    .from(state)
    .where(eq(state.id, stateId))
    .limit(1);

  if (stateData.length === 0) {
    throw new Error("Invalid stateId");
  }

  const statePersons = await db
    .select({ wcaId: person.wcaId })
    .from(person)
    .where(eq(person.stateId, stateId));

  const personIds = statePersons.map((p) => p.wcaId);

  if (personIds.length === 0) {
    return { personIds: [] as string[], singleCount: 0, averageCount: 0 };
  }

  await db
    .update(result)
    .set({
      stateSingleRecord: null,
      stateAverageRecord: null,
    })
    .where(inArray(result.personId, personIds));

  const events = await db
    .select({ id: event.id })
    .from(event)
    .where(notInArray(event.id, EXCLUDED_EVENTS));

  const singleSrIds: string[] = [];
  const averageSrIds: string[] = [];

  const recordDateExpr = sql<
    Date | string
  >`COALESCE(${competitionRoundDate.endDate}, ${competition.startDate})`;

  for (const e of events) {
    const singleRows = await db
      .select({
        id: result.id,
        value: result.best,
        recordDate: recordDateExpr,
        regionalRecord: result.regionalSingleRecord,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(roundType, eq(result.roundTypeId, roundType.id))
      .leftJoin(
        competitionRoundDate,
        and(
          eq(competitionRoundDate.competitionId, result.competitionId),
          eq(competitionRoundDate.eventId, result.eventId),
          eq(competitionRoundDate.roundTypeId, result.roundTypeId),
        ),
      )
      .where(
        and(
          eq(result.eventId, e.id),
          inArray(result.personId, personIds),
          gt(result.best, 0),
        ),
      )
      .orderBy(
        asc(recordDateExpr),
        asc(competition.id),
        asc(sql`COALESCE(${roundType.rank}, 0)`),
        asc(result.best),
        asc(result.id),
      );

    markStateRecords(singleRows, singleSrIds);

    const averageRows = await db
      .select({
        id: result.id,
        value: result.average,
        recordDate: recordDateExpr,
        regionalRecord: result.regionalAverageRecord,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(roundType, eq(result.roundTypeId, roundType.id))
      .leftJoin(
        competitionRoundDate,
        and(
          eq(competitionRoundDate.competitionId, result.competitionId),
          eq(competitionRoundDate.eventId, result.eventId),
          eq(competitionRoundDate.roundTypeId, result.roundTypeId),
        ),
      )
      .where(
        and(
          eq(result.eventId, e.id),
          inArray(result.personId, personIds),
          gt(result.average, 0),
        ),
      )
      .orderBy(
        asc(recordDateExpr),
        asc(competition.id),
        asc(sql`COALESCE(${roundType.rank}, 0)`),
        asc(result.average),
        asc(result.id),
      );

    markStateRecords(averageRows, averageSrIds);
  }

  const chunkSize = 100;

  for (let i = 0; i < singleSrIds.length; i += chunkSize) {
    const chunk = singleSrIds.slice(i, i + chunkSize);
    await db
      .update(result)
      .set({ stateSingleRecord: SR })
      .where(
        and(
          inArray(result.id, chunk),
          or(
            isNull(result.regionalSingleRecord),
            notInArray(result.regionalSingleRecord, [
              ...REGIONAL_RECORD_MARKERS,
            ]),
          ),
        ),
      );
  }

  for (let i = 0; i < averageSrIds.length; i += chunkSize) {
    const chunk = averageSrIds.slice(i, i + chunkSize);
    await db
      .update(result)
      .set({ stateAverageRecord: SR })
      .where(
        and(
          inArray(result.id, chunk),
          or(
            isNull(result.regionalAverageRecord),
            notInArray(result.regionalAverageRecord, [
              ...REGIONAL_RECORD_MARKERS,
            ]),
          ),
        ),
      );
  }

  return {
    personIds,
    singleCount: singleSrIds.length,
    averageCount: averageSrIds.length,
  };
}

function toDateKey(recordDate: Date | string): string {
  if (recordDate instanceof Date) {
    return recordDate.toISOString().slice(0, 10);
  }
  return String(recordDate).slice(0, 10);
}

function isRegionalRecord(marker: string | null | undefined): boolean {
  if (marker == null) return false;
  return REGIONAL_RECORD_MARKER_SET.has(marker.trim());
}

/**
 * Tag SR for chronological improvements, collapsing to the best value per
 * calendar day (9i2) and skipping results that already hold NR/NAR/WR.
 */
function markStateRecords(rows: StateRecordRow[], outIds: string[]) {
  let bestSoFar: number | null = null;
  let dayKey: string | null = null;
  let dayCandidates: StateRecordRow[] = [];

  const flushDay = () => {
    if (dayCandidates.length === 0) {
      return;
    }

    const improvements = dayCandidates.filter(
      (row) => bestSoFar === null || row.value <= bestSoFar,
    );

    if (improvements.length === 0) {
      dayCandidates = [];
      return;
    }

    const dayBest = Math.min(...improvements.map((row) => row.value));

    for (const row of improvements) {
      if (row.value === dayBest && !isRegionalRecord(row.regionalRecord)) {
        outIds.push(row.id);
      }
    }

    bestSoFar = dayBest;
    dayCandidates = [];
  };

  for (const row of rows) {
    if (row.value <= 0) continue;

    const key = toDateKey(row.recordDate);

    if (dayKey !== null && key !== dayKey) {
      flushDay();
    }

    dayKey = key;
    dayCandidates.push(row);
  }

  flushDay();
}
