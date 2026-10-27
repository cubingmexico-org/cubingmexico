import "server-only";

import { db } from "@workspace/db";
import { competition, result } from "@workspace/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { EventScope } from "@/lib/constants";
import { inScopeEvents } from "@/lib/official-events";
import { computePrStreaks, type PersonPrStreaks } from "./pr-streaks-compute";

export type {
  PersonPrStreakCompetition,
  PersonPrStreaks,
} from "./pr-streaks-compute";

export async function getPersonPrStreaks(
  wcaId: string,
  scope: EventScope,
): Promise<PersonPrStreaks> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-pr-streaks-${wcaId}`);

  const rows = await db
    .select({
      competitionId: result.competitionId,
      eventId: result.eventId,
      best: result.best,
      average: result.average,
      competitionName: competition.name,
      startDate: competition.startDate,
      endDate: competition.endDate,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(eq(result.personId, wcaId), inScopeEvents(result.eventId, scope)),
    )
    .orderBy(asc(competition.startDate), asc(result.competitionId));

  return computePrStreaks(rows);
}
