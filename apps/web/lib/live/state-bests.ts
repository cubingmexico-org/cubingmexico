import "server-only";

import { db } from "@workspace/db";
import { person, rankAverage, rankSingle } from "@workspace/db/schema";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { SINGLE_EVENTS } from "@/lib/constants";
import type { StateBestMap } from "./state-records";

function toBestMap(
  rows: { stateId: string | null; best: number | null }[],
): StateBestMap {
  const map: StateBestMap = new Map();
  for (const row of rows) {
    if (row.stateId != null && row.best != null && row.best > 0) {
      map.set(row.stateId, row.best);
    }
  }
  return map;
}

export async function getStateSingleBests(
  eventId: string,
  stateIds: string[],
): Promise<StateBestMap> {
  const unique = [...new Set(stateIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await db
    .select({
      stateId: person.stateId,
      best: sql<number>`min(${rankSingle.best})`,
    })
    .from(rankSingle)
    .innerJoin(person, eq(rankSingle.personId, person.wcaId))
    .where(
      and(
        eq(rankSingle.eventId, eventId),
        gt(rankSingle.best, 0),
        inArray(person.stateId, unique),
      ),
    )
    .groupBy(person.stateId);

  return toBestMap(rows);
}

export async function getStateAverageBests(
  eventId: string,
  stateIds: string[],
): Promise<StateBestMap> {
  if ((SINGLE_EVENTS as readonly string[]).includes(eventId)) {
    return new Map();
  }

  const unique = [...new Set(stateIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const rows = await db
    .select({
      stateId: person.stateId,
      best: sql<number>`min(${rankAverage.best})`,
    })
    .from(rankAverage)
    .innerJoin(person, eq(rankAverage.personId, person.wcaId))
    .where(
      and(
        eq(rankAverage.eventId, eventId),
        gt(rankAverage.best, 0),
        inArray(person.stateId, unique),
      ),
    )
    .groupBy(person.stateId);

  return toBestMap(rows);
}
