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
import { and, eq, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { medalEligibleSql } from "@/lib/medals";
import type { CompetitionResultRow } from "../../../_lib/results";

export async function getCompetitionPodiumGroups(
  competitionId: string,
): Promise<[string, CompetitionResultRow[]][]> {
  cacheLife("weeks");
  cacheTag(`competition-results-podiums-${competitionId}`);

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
      globalPos: result.globalPos,
      isDual: result.isDual,
      best: result.best,
      average: result.average,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .leftJoin(state, eq(person.stateId, state.id))
    .where(
      and(
        eq(result.competitionId, competitionId),
        medalEligibleSql(),
        // Podium page shows finals / dual-final standings only.
        sql`(${result.roundTypeId} IN ('f', 'c') OR ${result.isDual} = true)`,
      ),
    )
    .orderBy(event.rank, result.globalPos, result.best);

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
      const list = accumulator.get(resultRow.eventId) ?? [];
      list.push(resultRow);
      accumulator.set(resultRow.eventId, list);
      return accumulator;
    }, new Map<string, CompetitionResultRow[]>()),
  ).map(([eventId, eventRows]) => {
    // One person per dual pair (keep better solve / lower global pos row).
    const byPerson = new Map<string, (typeof eventRows)[number]>();
    for (const row of eventRows) {
      const existing = byPerson.get(row.personId);
      if (
        !existing ||
        (row.globalPos ?? 999) < (existing.globalPos ?? 999) ||
        ((row.globalPos ?? 999) === (existing.globalPos ?? 999) &&
          row.best > 0 &&
          (existing.best <= 0 || row.best < existing.best))
      ) {
        byPerson.set(row.personId, row);
      }
    }

    const top3 = Array.from(byPerson.values())
      .sort(
        (a, b) =>
          (a.globalPos ?? a.position ?? 999) -
          (b.globalPos ?? b.position ?? 999),
      )
      .slice(0, 3)
      .map((row, index) => ({
        ...row,
        position: index + 1,
        globalPos: row.globalPos ?? index + 1,
      }));

    return [eventId, top3] as [string, CompetitionResultRow[]];
  });
}
