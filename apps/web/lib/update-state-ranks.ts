import { db } from "@workspace/db";
import { and, asc, eq, inArray, ne, notInArray } from "drizzle-orm";
import {
  person,
  rankAverage,
  event,
  rankSingle,
  state,
} from "@workspace/db/schema";
import { EXCLUDED_EVENTS } from "@/lib/constants";
import {
  assignSequentialRanks,
  type RankRecord,
} from "@/lib/assign-sequential-ranks";

export { assignSequentialRanks } from "@/lib/assign-sequential-ranks";
export type { RankRecord } from "@/lib/assign-sequential-ranks";

/** Clear stateRank for people leaving a state (or changing states). */
export async function clearPersonStateRanks(personIds: string[]) {
  if (personIds.length === 0) {
    return;
  }

  await db
    .update(rankSingle)
    .set({ stateRank: null })
    .where(inArray(rankSingle.personId, personIds));

  await db
    .update(rankAverage)
    .set({ stateRank: null })
    .where(inArray(rankAverage.personId, personIds));
}

export async function updateStateRanks(stateId: string) {
  const stateData = await db
    .select()
    .from(state)
    .where(eq(state.id, stateId))
    .limit(1);

  if (stateData.length === 0) {
    throw new Error("Invalid stateId");
  }

  await db.transaction(async (tx) => {
    const events = await tx
      .select()
      .from(event)
      .where(notInArray(event.id, EXCLUDED_EVENTS));

    const statePersons = await tx
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(eq(person.stateId, stateId));

    const personIds = statePersons.map((p) => p.wcaId);

    if (personIds.length > 0) {
      await tx
        .update(rankSingle)
        .set({ stateRank: null })
        .where(inArray(rankSingle.personId, personIds));

      await tx
        .update(rankAverage)
        .set({ stateRank: null })
        .where(inArray(rankAverage.personId, personIds));
    }

    const singleUpdates: (RankRecord & { stateRank: number })[] = [];
    const averageUpdates: (RankRecord & { stateRank: number })[] = [];

    for (const e of events) {
      const singleWhere = and(
        ne(rankSingle.countryRank, 0),
        eq(rankSingle.eventId, e.id),
        eq(state.id, stateId),
      );

      const singleData = await tx
        .select({
          personId: rankSingle.personId,
          eventId: rankSingle.eventId,
        })
        .from(rankSingle)
        .innerJoin(person, eq(rankSingle.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(singleWhere)
        .orderBy(asc(rankSingle.countryRank));

      singleUpdates.push(...assignSequentialRanks(singleData));

      const averageWhere = and(
        ne(rankAverage.countryRank, 0),
        eq(rankAverage.eventId, e.id),
        eq(state.id, stateId),
      );

      const averageData = await tx
        .select({
          personId: rankAverage.personId,
          eventId: rankAverage.eventId,
        })
        .from(rankAverage)
        .innerJoin(person, eq(rankAverage.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(averageWhere)
        .orderBy(asc(rankAverage.countryRank));

      averageUpdates.push(...assignSequentialRanks(averageData));
    }

    const chunkSize = 50;

    for (let i = 0; i < singleUpdates.length; i += chunkSize) {
      const chunk = singleUpdates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((update) =>
          tx
            .update(rankSingle)
            .set({ stateRank: update.stateRank })
            .where(
              and(
                eq(rankSingle.personId, update.personId),
                eq(rankSingle.eventId, update.eventId),
              ),
            ),
        ),
      );
    }

    for (let i = 0; i < averageUpdates.length; i += chunkSize) {
      const chunk = averageUpdates.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((update) =>
          tx
            .update(rankAverage)
            .set({ stateRank: update.stateRank })
            .where(
              and(
                eq(rankAverage.personId, update.personId),
                eq(rankAverage.eventId, update.eventId),
              ),
            ),
        ),
      );
    }
  });
}
