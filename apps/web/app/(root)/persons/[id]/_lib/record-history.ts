import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  competitionRoundDate,
  result,
  event,
} from "@workspace/db/schema";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { recordDateSql, toDateKey } from "@/lib/record-date";
import { getAttemptsByResultId } from "./result-attempts";

export type PersonRecordHistoryEntry = {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  competitionId: string;
  competitionName: string;
  competitionStartDate: string;
  roundTypeId: string | null;
  position: number | null;
  best: number;
  average: number;
  regionalSingleRecord: string | null;
  regionalAverageRecord: string | null;
  stateSingleRecord: string | null;
  stateAverageRecord: string | null;
  solves: number[];
};

export async function getPersonRecordHistory(
  wcaId: string,
): Promise<PersonRecordHistoryEntry[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-record-history-${wcaId}`);

  const rows = await db
    .select({
      resultId: result.id,
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      competitionId: competition.id,
      competitionName: competition.name,
      competitionStartDate: recordDateSql,
      roundTypeId: result.roundTypeId,
      position: result.pos,
      best: result.best,
      average: result.average,
      regionalSingleRecord: result.regionalSingleRecord,
      regionalAverageRecord: result.regionalAverageRecord,
      stateSingleRecord: result.stateSingleRecord,
      stateAverageRecord: result.stateAverageRecord,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(
      competitionRoundDate,
      and(
        eq(competitionRoundDate.competitionId, result.competitionId),
        eq(competitionRoundDate.eventId, result.eventId),
        eq(competitionRoundDate.roundTypeId, result.roundTypeId),
      ),
    )
    .where(
      and(
        eq(result.personId, wcaId),
        or(
          inArray(result.regionalSingleRecord, ["NR", "NAR", "WR"]),
          inArray(result.regionalAverageRecord, ["NR", "NAR", "WR"]),
          eq(result.stateSingleRecord, "SR"),
          eq(result.stateAverageRecord, "SR"),
        ),
      ),
    )
    .orderBy(event.rank, desc(recordDateSql));

  if (rows.length === 0) return [];

  const attemptsByResultId = await getAttemptsByResultId(
    rows.map((r) => r.resultId),
  );

  return rows.map((row) => ({
    ...row,
    competitionStartDate: toDateKey(row.competitionStartDate),
    solves: attemptsByResultId.get(row.resultId) ?? [],
  }));
}
