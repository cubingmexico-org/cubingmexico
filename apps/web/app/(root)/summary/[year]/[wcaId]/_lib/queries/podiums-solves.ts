import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  event,
  result,
  resultAttempts,
} from "@workspace/db/schema";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import type {
  PodiumByEvent,
  SolvesByEvent,
  YearPodiums,
  YearSolves,
} from "./types";

/** `yearOfficialFilter` must already restrict results to the person, the year and official events. */
export async function computeYearPodiums(
  yearOfficialFilter: SQL | undefined,
): Promise<YearPodiums> {
  const podiumRows = await db
    .select({
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
      silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
      bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(event, eq(result.eventId, event.id))
    .where(
      and(
        yearOfficialFilter,
        sql`${result.roundTypeId} IN ('f', 'c')`,
        sql`${result.pos} IN (1, 2, 3)`,
        sql`${result.best} > 0`,
      ),
    )
    .groupBy(result.eventId, event.name, event.rank)
    .orderBy(asc(event.rank));

  const byEvent: PodiumByEvent[] = podiumRows
    .map((row) => ({
      eventId: row.eventId,
      eventName: row.eventName,
      eventRank: row.eventRank,
      gold: Number(row.gold),
      silver: Number(row.silver),
      bronze: Number(row.bronze),
    }))
    .filter((row) => row.gold + row.silver + row.bronze > 0)
    .sort((a, b) => {
      const totalDiff =
        b.gold + b.silver + b.bronze - (a.gold + a.silver + a.bronze);
      if (totalDiff !== 0) return totalDiff;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return a.eventRank - b.eventRank;
    });

  const gold = byEvent.reduce((sum, row) => sum + row.gold, 0);
  const silver = byEvent.reduce((sum, row) => sum + row.silver, 0);
  const bronze = byEvent.reduce((sum, row) => sum + row.bronze, 0);

  return {
    total: gold + silver + bronze,
    events: byEvent.length,
    gold,
    silver,
    bronze,
    byEvent,
  };
}

/** `yearOfficialFilter` must already restrict results to the person, the year and official events. */
export async function computeYearSolves(
  yearOfficialFilter: SQL | undefined,
): Promise<YearSolves> {
  const solveRows = await db
    .select({
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      solves: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0)::int`,
      // Count successful solves and DNFs; DNS (-2) is not an attempt.
      attempts: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0 OR ${resultAttempts.value} = -1)::int`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(resultAttempts, eq(resultAttempts.resultId, result.id))
    .where(yearOfficialFilter)
    .groupBy(result.eventId, event.name, event.rank)
    .orderBy(
      desc(
        sql`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0 OR ${resultAttempts.value} = -1)`,
      ),
      asc(event.rank),
    );

  const byEvent: SolvesByEvent[] = solveRows.map((row) => ({
    eventId: row.eventId,
    eventName: row.eventName,
    eventRank: row.eventRank,
    solves: Number(row.solves),
    attempts: Number(row.attempts),
  }));

  return {
    totalSolves: byEvent.reduce((sum, row) => sum + row.solves, 0),
    totalAttempts: byEvent.reduce((sum, row) => sum + row.attempts, 0),
    byEvent,
  };
}
