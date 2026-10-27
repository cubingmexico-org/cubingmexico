import "server-only";

import { db } from "@workspace/db";
import { competition, result } from "@workspace/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";

export function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export async function getCompetedSummaryYears(
  wcaId: string,
): Promise<number[]> {
  "use cache";
  cacheLife("days");
  cacheTag(`person-summary-years-${wcaId}`);

  const yearSql = sql<number>`EXTRACT(YEAR FROM ${competition.startDate} AT TIME ZONE 'UTC')::int`;

  const rows = await db
    .select({ year: yearSql })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(eq(result.personId, wcaId))
    .groupBy(yearSql)
    .orderBy(desc(yearSql));

  return rows
    .map((row) => Number(row.year))
    .filter((year) => !Number.isNaN(year));
}

export async function getAvailableSummaryYears(
  wcaId: string,
): Promise<number[]> {
  const years = await getCompetedSummaryYears(wcaId);
  return years.filter((year) => isSummaryYearPublished(year));
}
