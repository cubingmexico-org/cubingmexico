import { db } from "@workspace/db";
import { and, asc, eq, ne, notInArray } from "drizzle-orm";
import {
  person,
  rankAverage,
  event,
  rankSingle,
  state,
} from "@workspace/db/schema";
import { EXCLUDED_EVENTS } from "@/lib/constants";

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

    await tx.update(rankSingle).set({ stateRank: null });
    await tx.update(rankAverage).set({ stateRank: null });

    const singleUpdates: {
      personId: string;
      eventId: string;
      stateRank: number;
    }[] = [];
    const averageUpdates: {
      personId: string;
      eventId: string;
      stateRank: number;
    }[] = [];

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

      let singleStateRank = 1;
      for (const record of singleData) {
        singleUpdates.push({
          personId: record.personId,
          eventId: record.eventId,
          stateRank: singleStateRank,
        });
        singleStateRank++;
      }

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

      let averageStateRank = 1;
      for (const record of averageData) {
        averageUpdates.push({
          personId: record.personId,
          eventId: record.eventId,
          stateRank: averageStateRank,
        });
        averageStateRank++;
      }
    }

    for (const update of singleUpdates) {
      await tx
        .update(rankSingle)
        .set({ stateRank: update.stateRank })
        .where(
          and(
            eq(rankSingle.personId, update.personId),
            eq(rankSingle.eventId, update.eventId),
          ),
        );
    }

    for (const update of averageUpdates) {
      await tx
        .update(rankAverage)
        .set({ stateRank: update.stateRank })
        .where(
          and(
            eq(rankAverage.personId, update.personId),
            eq(rankAverage.eventId, update.eventId),
          ),
        );
    }
  });
}
