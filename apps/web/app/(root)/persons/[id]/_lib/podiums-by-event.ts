import "server-only";

import { db } from "@workspace/db";
import { result, event } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { EventScope } from "@/lib/constants";
import { inScopeEvents } from "@/lib/official-events";

export type PersonPodiumsByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
};

export async function getPersonPodiumsByEvent(
  wcaId: string,
  scope: EventScope,
): Promise<PersonPodiumsByEvent[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-podiums-by-event-${wcaId}`);

  const rows = await db
    .select({
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
      gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1 AND ${result.roundTypeId} IN('f','c') AND ${result.best} > 0)`,
      silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2 AND ${result.roundTypeId} IN('f','c') AND ${result.best} > 0)`,
      bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3 AND ${result.roundTypeId} IN('f','c') AND ${result.best} > 0)`,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .where(
      and(eq(result.personId, wcaId), inScopeEvents(result.eventId, scope)),
    )
    .groupBy(event.id, event.name, event.rank);

  return rows
    .map((row) => {
      const gold = Number(row.gold ?? 0);
      const silver = Number(row.silver ?? 0);
      const bronze = Number(row.bronze ?? 0);
      return {
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: Number(row.eventRank ?? 0),
        gold,
        silver,
        bronze,
        total: gold + silver + bronze,
      };
    })
    .sort(
      (a, b) =>
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        a.eventRank - b.eventRank,
    );
}
