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
import { eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import type {
  CompetitionResultRow,
  ResultsByPersonGroup,
} from "../../../_lib/results";

export async function getCompetitionResultsGroupedByPerson(
  competitionId: string,
): Promise<ResultsByPersonGroup[]> {
  cacheLife("weeks");
  cacheTag(`competition-results-by-person-${competitionId}`);

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
      .orderBy(person.name, event.rank, result.pos, result.best);

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

    const groupedByPersonMap = rowsWithSolves.reduce(
      (accumulator, resultRow) => {
        const existing = accumulator.get(resultRow.personId) ?? {
          personId: resultRow.personId,
          personName: resultRow.personName,
          results: [] as CompetitionResultRow[],
        };

        existing.results.push(resultRow);
        accumulator.set(resultRow.personId, existing);

        return accumulator;
      },
      new Map<string, ResultsByPersonGroup>(),
    );

    const groupedByPerson = Array.from(groupedByPersonMap.values());

    return groupedByPerson.sort((left, right) => {
      const leftName = left.personName ?? left.personId;
      const rightName = right.personName ?? right.personId;
      return leftName.localeCompare(rightName, "es-MX");
    });
  } catch (err) {
    console.error(err);
    return [];
  }
}
