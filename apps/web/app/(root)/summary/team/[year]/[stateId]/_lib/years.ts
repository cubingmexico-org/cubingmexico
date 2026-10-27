import "server-only";

import { db } from "@workspace/db";
import { competition, person, result } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";

export function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/** Years the team hosted a competition or a member competed, newest first. */
export async function getTeamSummaryYears(stateId: string): Promise<number[]> {
  "use cache";
  cacheLife("days");
  cacheTag(`team-summary-years-${stateId}`);

  const yearSql = sql<number>`EXTRACT(YEAR FROM ${competition.startDate} AT TIME ZONE 'UTC')::int`;

  const [hostedYears, memberYears] = await Promise.all([
    db
      .select({ year: yearSql })
      .from(competition)
      .where(eq(competition.stateId, stateId))
      .groupBy(yearSql),
    db
      .select({ year: yearSql })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(eq(person.stateId, stateId))
      .groupBy(yearSql),
  ]);

  const years = new Set<number>();
  for (const row of hostedYears) {
    const y = Number(row.year);
    if (!Number.isNaN(y)) years.add(y);
  }
  for (const row of memberYears) {
    const y = Number(row.year);
    if (!Number.isNaN(y)) years.add(y);
  }

  return Array.from(years).sort((a, b) => b - a);
}

export async function getAvailableTeamSummaryYears(
  stateId: string,
): Promise<number[]> {
  const years = await getTeamSummaryYears(stateId);
  return years.filter((year) => isSummaryYearPublished(year));
}
