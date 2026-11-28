import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  groupMembership,
  person,
  result,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";

export function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/** Years a community member competed, newest first. */
export async function getCommunitySummaryYears(
  groupId: string,
): Promise<number[]> {
  "use cache";
  cacheLife("days");
  cacheTag(`community-summary-years-${groupId}`);

  const yearSql = sql<number>`EXTRACT(YEAR FROM ${competition.startDate} AT TIME ZONE 'UTC')::int`;

  const memberYears = await db
    .select({ year: yearSql })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .innerJoin(
      groupMembership,
      and(
        eq(groupMembership.personId, person.wcaId),
        eq(groupMembership.groupId, groupId),
        eq(groupMembership.hideFromRoster, false),
      ),
    )
    .groupBy(yearSql);

  const years = new Set<number>();
  for (const row of memberYears) {
    const y = Number(row.year);
    if (!Number.isNaN(y)) years.add(y);
  }

  return Array.from(years).sort((a, b) => b - a);
}

export async function getAvailableCommunitySummaryYears(
  groupId: string,
): Promise<number[]> {
  const years = await getCommunitySummaryYears(groupId);
  return years.filter((year) => isSummaryYearPublished(year));
}
