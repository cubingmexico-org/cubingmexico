import { db } from "@workspace/db";
import { and, asc, eq, gt, inArray, notInArray, sql } from "drizzle-orm";
import {
  competition,
  event,
  person,
  result,
  roundType,
  state,
} from "@workspace/db/schema";
import { EXCLUDED_EVENTS } from "@/lib/constants";

const SR = "SR";

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

  for (const e of events) {
    const singleRows = await db
      .select({
        id: result.id,
        value: result.best,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(roundType, eq(result.roundTypeId, roundType.id))
      .where(
        and(
          eq(result.eventId, e.id),
          inArray(result.personId, personIds),
          gt(result.best, 0),
        ),
      )
      .orderBy(
        asc(competition.startDate),
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
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .leftJoin(roundType, eq(result.roundTypeId, roundType.id))
      .where(
        and(
          eq(result.eventId, e.id),
          inArray(result.personId, personIds),
          gt(result.average, 0),
        ),
      )
      .orderBy(
        asc(competition.startDate),
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
      .where(inArray(result.id, chunk));
  }

  for (let i = 0; i < averageSrIds.length; i += chunkSize) {
    const chunk = averageSrIds.slice(i, i + chunkSize);
    await db
      .update(result)
      .set({ stateAverageRecord: SR })
      .where(inArray(result.id, chunk));
  }

  return {
    personIds,
    singleCount: singleSrIds.length,
    averageCount: averageSrIds.length,
  };
}

function markStateRecords(
  rows: { id: string; value: number }[],
  outIds: string[],
) {
  let bestSoFar: number | null = null;

  for (const row of rows) {
    if (row.value <= 0) continue;

    if (bestSoFar === null || row.value <= bestSoFar) {
      outIds.push(row.id);
      bestSoFar = row.value;
    }
  }
}
