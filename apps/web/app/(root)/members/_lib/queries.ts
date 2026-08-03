"use cache";

import "server-only";
import { db } from "@workspace/db";
import { getEvents } from "@/db/queries";
import { championship, person, result, state } from "@workspace/db/schema";
import {
  SPEEDSOLVING_AVERAGES_EVENTS,
  BLD_FMC_MEANS_EVENTS,
} from "@/lib/constants";
import { and, countDistinct, eq, gt, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export async function getMollerzMembers() {
  cacheLife("days");
  cacheTag("mollerz-members");

  try {
    const events = await getEvents();

    const members = await db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gender: person.gender,
        state: state.name,
        numberOfSpeedsolvingAverages: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(SPEEDSOLVING_AVERAGES_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
        numberOfBLDFMCMeans: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(BLD_FMC_MEANS_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
        hasWorldRecord: sql<boolean>`MAX(CASE WHEN ${result.regionalSingleRecord} = 'WR' OR ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END) = 1`,
        hasWorldChampionshipPodium: sql<boolean>`MAX(CASE WHEN ${result.pos} IN(1, 2, 3) AND ${result.roundTypeId} IN('f', 'c') AND ${championship.championshipType} = 'world' THEN 1 ELSE 0 END) = 1`,
        eventsWon: sql<number>`COUNT(DISTINCT CASE WHEN ${result.pos} = 1 AND ${result.roundTypeId} IN('f', 'c') THEN ${result.eventId} ELSE NULL END)`,
      })
      .from(person)
      .innerJoin(result, eq(person.wcaId, result.personId))
      .leftJoin(state, eq(person.stateId, state.id))
      .leftJoin(
        championship,
        eq(result.competitionId, championship.competitionId),
      )
      .where(
        and(
          inArray(
            result.eventId,
            events.map((event) => event.id),
          ),
          gt(result.best, 0),
        ),
      )
      .groupBy(person.wcaId, person.name, person.gender, state.name)
      .having(eq(countDistinct(result.eventId), events.length));
    return members;
  } catch (error) {
    console.error(error);
    return [];
  }
}
