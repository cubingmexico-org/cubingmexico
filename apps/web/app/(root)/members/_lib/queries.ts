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
import type { MollerzScope } from "./scopes";

async function getNationalChampionshipPodiumIds(): Promise<Set<string>> {
  // Nationals results only include Mexicans, so RANK() yields nationality-based places.
  const rows = (await db.execute(sql`
    SELECT DISTINCT person_id AS "personId"
    FROM (
      SELECT ${result.personId} AS person_id,
             RANK() OVER (
               PARTITION BY ${result.competitionId}, ${result.eventId}, ${result.roundTypeId}
               ORDER BY ${result.pos}
             ) AS championship_pos
      FROM ${result}
      INNER JOIN ${championship}
        ON ${championship.competitionId} = ${result.competitionId}
      WHERE ${championship.championshipType} = 'MX'
        AND ${result.roundTypeId} IN ('f', 'c')
        AND ${result.best} > 0
    ) AS ranked
    WHERE championship_pos <= 3
  `)) as unknown as Array<{ personId: string }>;

  return new Set(rows.map((row) => row.personId));
}

export async function getMollerzMembers(scope: MollerzScope) {
  cacheLife("days");
  cacheTag("mollerz-members");

  const events = await getEvents();

  const hasRecord =
    scope === "national"
      ? sql<boolean>`MAX(CASE WHEN COALESCE(${result.regionalSingleRecord}, '') <> '' OR COALESCE(${result.regionalAverageRecord}, '') <> '' THEN 1 ELSE 0 END) = 1`
      : sql<boolean>`MAX(CASE WHEN ${result.regionalSingleRecord} = 'WR' OR ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END) = 1`;

  const [members, nationalPodiumIds] = await Promise.all([
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gender: person.gender,
        state: state.name,
        numberOfSpeedsolvingAverages: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(SPEEDSOLVING_AVERAGES_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
        numberOfBLDFMCMeans: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(BLD_FMC_MEANS_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
        hasRecord,
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
      .having(eq(countDistinct(result.eventId), events.length)),
    scope === "national"
      ? getNationalChampionshipPodiumIds()
      : Promise.resolve(null),
  ]);

  return members.map(({ hasWorldChampionshipPodium, ...member }) => ({
    ...member,
    hasChampionshipPodium: nationalPodiumIds
      ? nationalPodiumIds.has(member.wcaId)
      : hasWorldChampionshipPodium,
  }));
}
