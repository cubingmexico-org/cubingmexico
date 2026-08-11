"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  event,
  person,
  result,
  resultAttempts,
} from "@workspace/db/schema";
import { and, eq, inArray, asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { roundRank } from "@/lib/utils";
import { getTeamStatisticsData } from "../../_lib/queries";

export async function getStatisticsPageData(stateId: string) {
  return getTeamStatisticsData(stateId);
}

export type TeamResultsEventOption = {
  eventId: string;
  eventName: string;
  eventRank: number;
};

export type TeamCompetitionResultRow = {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  personId: string;
  personName: string | null;
  competitionId: string;
  competitionName: string;
  competitionStartDate: string;
  roundTypeId: string | null;
  position: number | null;
  best: number;
  average: number;
  stateSingleRecord: string | null;
  solves: number[];
  isStateRecordSingle: boolean;
};

export type TeamResultsByEventGroup = {
  eventId: string;
  eventName: string;
  eventRank: number;
  results: TeamCompetitionResultRow[];
};

export async function getTeamCompetitionEventOptions(
  stateId: string,
): Promise<TeamResultsEventOption[]> {
  cacheLife("weeks");
  cacheTag(`team-competition-event-options-${stateId}`);

  try {
    return await db
      .select({
        eventId: event.id,
        eventName: event.name,
        eventRank: event.rank,
      })
      .from(result)
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(eq(person.stateId, stateId))
      .groupBy(event.id, event.name, event.rank)
      .orderBy(asc(event.rank));
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function fetchAttemptsForResultIds(resultIds: string[]) {
  const attemptsByResultId = new Map<string, number[]>();
  const chunkSize = 500;

  for (let i = 0; i < resultIds.length; i += chunkSize) {
    const chunk = resultIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const attempts = await db
      .select({
        resultId: resultAttempts.resultId,
        attemptNumber: resultAttempts.attemptNumber,
        value: resultAttempts.value,
      })
      .from(resultAttempts)
      .where(inArray(resultAttempts.resultId, chunk))
      .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

    for (const attempt of attempts) {
      const values = attemptsByResultId.get(attempt.resultId) ?? [];
      values.push(attempt.value);
      attemptsByResultId.set(attempt.resultId, values);
    }
  }

  return attemptsByResultId;
}

export async function getTeamCompetitionResults(
  stateId: string,
  eventId: string,
): Promise<TeamResultsByEventGroup | null> {
  cacheLife("weeks");
  cacheTag(`team-competition-results-${stateId}-${eventId}`);

  try {
    const rows = await db
      .select({
        resultId: result.id,
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        personId: person.wcaId,
        personName: person.name,
        competitionId: competition.id,
        competitionName: competition.name,
        competitionStartDate: competition.startDate,
        roundTypeId: result.roundTypeId,
        position: result.pos,
        best: result.best,
        average: result.average,
        stateSingleRecord: result.stateSingleRecord,
      })
      .from(result)
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(eq(person.stateId, stateId), eq(result.eventId, eventId)))
      .orderBy(asc(competition.startDate), asc(result.pos), asc(result.best));

    if (rows.length === 0) {
      return null;
    }

    const attemptsByResultId = await fetchAttemptsForResultIds(
      rows.map((row) => row.resultId),
    );

    const results: TeamCompetitionResultRow[] = rows.map((row) => ({
      ...row,
      competitionStartDate: row.competitionStartDate.toISOString(),
      solves: attemptsByResultId.get(row.resultId) ?? [],
      isStateRecordSingle: false,
    }));

    const chronological = results.slice().sort((a, b) => {
      const dateDelta =
        Date.parse(a.competitionStartDate) - Date.parse(b.competitionStartDate);
      if (dateDelta !== 0) return dateDelta;

      const roundDelta = roundRank(b.roundTypeId) - roundRank(a.roundTypeId);
      if (roundDelta !== 0) return roundDelta;

      return (a.position ?? 999) - (b.position ?? 999) || a.best - b.best;
    });

    let bestSingleSeen = 0;
    for (const r of chronological) {
      if (r.best > 0 && (bestSingleSeen === 0 || r.best <= bestSingleSeen)) {
        r.isStateRecordSingle = true;
        bestSingleSeen = r.best;
      } else {
        r.isStateRecordSingle = false;
      }
    }

    const first = rows[0]!;

    return {
      eventId: first.eventId,
      eventName: first.eventName,
      eventRank: first.eventRank,
      results: chronological,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}
