import "server-only";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { EventScope } from "@/lib/constants";
import {
  medalTierCountsFromMergedSql,
  mergedPodiumRowsSql,
} from "@/lib/medals";
import { eventIdsSql } from "@/lib/official-events";

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

  const {
    gold: goldSql,
    silver: silverSql,
    bronze: bronzeSql,
  } = medalTierCountsFromMergedSql();

  const rows = (await db.execute(sql`
    SELECT
      ranked.event_id AS "eventId",
      e.name AS "eventName",
      e.rank AS "eventRank",
      ${goldSql} AS gold,
      ${silverSql} AS silver,
      ${bronzeSql} AS bronze
    FROM (
      ${mergedPodiumRowsSql(sql`
        r.person_id = ${wcaId}
        AND r.event_id IN ${eventIdsSql(scope)}
      `)}
    ) ranked
    INNER JOIN events e ON e.id = ranked.event_id
    WHERE ranked.rn = 1
    GROUP BY ranked.event_id, e.name, e.rank
  `)) as unknown as Array<{
    eventId: string;
    eventName: string;
    eventRank: number;
    gold: number;
    silver: number;
    bronze: number;
  }>;

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
    .filter((row) => row.total > 0)
    .sort(
      (a, b) =>
        b.gold - a.gold ||
        b.silver - a.silver ||
        b.bronze - a.bronze ||
        a.eventRank - b.eventRank,
    );
}
