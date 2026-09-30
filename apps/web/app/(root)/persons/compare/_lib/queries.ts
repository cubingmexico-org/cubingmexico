import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  event,
  result,
  roundType,
} from "@workspace/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { recordDateSql, toDateKey } from "@/lib/record-date";
import type { HeadToHeadRound } from "@/lib/head-to-head";

export async function getHeadToHeadResults(
  a: string,
  b: string,
): Promise<HeadToHeadRound[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`head-to-head-${[a, b].sort().join("-")}`);

  const resultA = alias(result, "result_a");
  const resultB = alias(result, "result_b");

  const rows = await db
    .select({
      competitionId: competition.id,
      competitionName: competition.name,
      date: recordDateSql,
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
      roundTypeId: resultA.roundTypeId,
      aPos: resultA.pos,
      aBest: resultA.best,
      aAverage: resultA.average,
      bPos: resultB.pos,
      bBest: resultB.best,
      bAverage: resultB.average,
    })
    .from(resultA)
    .innerJoin(
      resultB,
      and(
        eq(resultB.competitionId, resultA.competitionId),
        eq(resultB.eventId, resultA.eventId),
        eq(resultB.roundTypeId, resultA.roundTypeId),
      ),
    )
    .innerJoin(competition, eq(resultA.competitionId, competition.id))
    .innerJoin(event, eq(resultA.eventId, event.id))
    .leftJoin(roundType, eq(resultA.roundTypeId, roundType.id))
    .leftJoin(
      competitionRoundDate,
      and(
        eq(competitionRoundDate.competitionId, resultA.competitionId),
        eq(competitionRoundDate.eventId, resultA.eventId),
        eq(competitionRoundDate.roundTypeId, resultA.roundTypeId),
      ),
    )
    .where(and(eq(resultA.personId, a), eq(resultB.personId, b)))
    .orderBy(desc(recordDateSql), asc(event.rank), desc(roundType.rank));

  return rows.map((row) => ({
    competitionId: row.competitionId,
    competitionName: row.competitionName,
    date: toDateKey(row.date),
    eventId: row.eventId,
    eventName: row.eventName,
    eventRank: row.eventRank,
    roundTypeId: row.roundTypeId,
    a: { pos: row.aPos, best: row.aBest, average: row.aAverage },
    b: { pos: row.bPos, best: row.bBest, average: row.bAverage },
  }));
}
