"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  event,
  person,
  result,
  state,
  resultAttempts,
} from "@workspace/db/schema";
import { eventNames } from "@/lib/constants";
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  type CompetitionResultRow,
  type ResultsByEventGroup,
} from "../../../_lib/results";
import { roundTypeLabel, roundRank } from "@/lib/utils";

export async function getCompetitionResultsGroupedByEvent(
  competitionId: string,
): Promise<ResultsByEventGroup[]> {
  cacheLife("weeks");
  cacheTag(`competition-results-all-${competitionId}`);

  try {
    const rows = await db
      .select({
        resultId: result.id,
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        personId: result.personId,
        personName: person.name,
        personState: state.name,
        roundTypeId: result.roundTypeId,
        position: result.pos,
        best: result.best,
        average: result.average,
      })
      .from(result)
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id))
      .where(eq(result.competitionId, competitionId))
      .orderBy(event.rank, result.pos, result.best);

    if (rows.length === 0) {
      return [];
    }

    const attempts = await db
      .select({
        resultId: resultAttempts.resultId,
        attemptNumber: resultAttempts.attemptNumber,
        value: resultAttempts.value,
      })
      .from(resultAttempts)
      .where(
        inArray(
          resultAttempts.resultId,
          rows.map((row) => row.resultId),
        ),
      )
      .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

    const attemptsByResultId = attempts.reduce((accumulator, attempt) => {
      const values = accumulator.get(attempt.resultId) ?? [];
      values.push(attempt.value);
      accumulator.set(attempt.resultId, values);
      return accumulator;
    }, new Map<string, number[]>());

    const rowsWithSolves = rows.map((row) => ({
      ...row,
      solves: attemptsByResultId.get(row.resultId) ?? [],
    }));

    return Array.from(
      rowsWithSolves.reduce((accumulator, resultRow) => {
        const eventId = resultRow.eventId ?? "";
        const rounds =
          accumulator.get(eventId) ?? new Map<string, CompetitionResultRow[]>();
        const roundId = resultRow.roundTypeId ?? "";
        const list = rounds.get(roundId) ?? [];
        list.push(resultRow);
        rounds.set(roundId, list);
        accumulator.set(eventId, rounds);
        return accumulator;
      }, new Map<string, Map<string, CompetitionResultRow[]>>()),
    ).map(([eventId, roundsMap]) => ({
      eventId,
      eventName: eventNames[eventId] || eventId,
      rounds: Array.from(roundsMap.entries())
        .map(([roundTypeId, rows]) => ({
          roundTypeId,
          roundLabel: roundTypeLabel(roundTypeId),
          rows: rows
            .slice()
            .sort(
              (left, right) =>
                left.eventRank - right.eventRank ||
                (left.position ?? 999) - (right.position ?? 999),
            ),
        }))
        .sort((a, b) => roundRank(a.roundTypeId) - roundRank(b.roundTypeId)),
    })) satisfies ResultsByEventGroup[];
  } catch (err) {
    console.error(err);
    return [];
  }
}
