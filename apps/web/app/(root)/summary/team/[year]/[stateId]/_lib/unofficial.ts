import "server-only";
import { db } from "@workspace/db";
import {
  ccPerson,
  ccResult,
  ccResultPerson,
  person,
} from "@workspace/db/schema";
import { and, countDistinct, eq, gte, lt } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type { CcYearSummary } from "@/lib/cubing-contests";
import {
  getCcResultsSummary,
  teamMemberCcResultIds,
} from "@/lib/cubing-contests-queries";

export type TeamYearUnofficial = CcYearSummary & { memberCount: number };

/**
 * Unofficial results of the team's members (`persons.state_id`) in the year.
 * A team-event result counts once even when several members took part.
 */
export async function getTeamYearUnofficial(
  stateId: string,
  year: number,
): Promise<TeamYearUnofficial> {
  "use cache";
  cacheLife("days");
  cacheTag("cc-results", `team-summary-unofficial-${stateId}-${year}`);

  const [summary, members] = await Promise.all([
    getCcResultsSummary(teamMemberCcResultIds(stateId), year),
    db
      .select({ count: countDistinct(person.wcaId) })
      .from(ccResultPerson)
      .innerJoin(ccPerson, eq(ccResultPerson.personId, ccPerson.id))
      .innerJoin(person, eq(ccPerson.wcaId, person.wcaId))
      .innerJoin(ccResult, eq(ccResultPerson.resultId, ccResult.id))
      .where(
        and(
          eq(person.stateId, stateId),
          gte(ccResult.date, new Date(Date.UTC(year, 0, 1))),
          lt(ccResult.date, new Date(Date.UTC(year + 1, 0, 1))),
        ),
      ),
  ]);

  return { ...summary, memberCount: Number(members[0]?.count ?? 0) };
}
