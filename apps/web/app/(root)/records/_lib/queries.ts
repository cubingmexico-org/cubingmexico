"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  event,
  state,
  person,
  result,
  competition,
  competitionRoundDate,
  resultAttempts,
} from "@workspace/db/schema";
import { and, desc, eq, gt, notInArray, sql, inArray, or } from "drizzle-orm";
import { EXCLUDED_EVENTS } from "@/lib/constants";
import { competitionAsOfCondition } from "@/lib/as-of-date";
import { recordDateSql, toDateKey } from "@/lib/record-date";
import { GetRecordsSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export type RecordHolder = {
  best: number;
  personId: string;
  name: string | null;
  gender: string | null;
  state: string | null;
  competitionId: string;
  competition: string;
  solves: number[];
};

export type CurrentRecord = {
  eventName: string;
  eventId: string;
  single: RecordHolder;
  average: RecordHolder | null;
};

export type RecordHistoryEntry = {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  personId: string;
  personName: string | null;
  personState: string | null;
  competitionId: string;
  competitionName: string;
  /** Calendar day used for 9i2 (round end date, else competition start date). YYYY-MM-DD */
  recordDate: string;
  roundTypeId: string | null;
  best: number;
  average: number;
  isSingleRecord: boolean;
  isAverageRecord: boolean;
  solves: number[];
};

export async function getRecords(input: GetRecordsSchema) {
  const asOfKey = input.asOf || "all";
  cacheLife("days");
  cacheTag(`records-${asOfKey}`);
  cacheTag("records");

  const singleWhere = and(
    input.state ? eq(state.name, input.state) : undefined,
    input.gender ? eq(person.gender, input.gender) : undefined,
    input.event ? eq(result.eventId, input.event) : undefined,
    notInArray(result.eventId, EXCLUDED_EVENTS),
    gt(result.best, 0),
    competitionAsOfCondition(input.asOf),
  );

  const averageWhere = and(
    input.state ? eq(state.name, input.state) : undefined,
    input.gender ? eq(person.gender, input.gender) : undefined,
    input.event ? eq(result.eventId, input.event) : undefined,
    notInArray(result.eventId, EXCLUDED_EVENTS),
    gt(result.average, 0),
    competitionAsOfCondition(input.asOf),
  );

  const combinedRecords = await db.transaction(async (tx) => {
    const singleRankedResults = tx.$with("ranked_results").as(
      tx
        .select({
          eventId: result.eventId,
          personId: result.personId,
          best: result.best,
          competitionId: result.competitionId,
          resultId: result.id,
          rowNum:
            sql<number>`row_number() OVER (PARTITION BY ${result.eventId} ORDER BY ${result.best} ASC)`.as(
              "rn",
            ),
        })
        .from(result)
        .innerJoin(person, eq(result.personId, person.wcaId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(singleWhere),
    );

    const singleRecords = await tx
      .with(singleRankedResults)
      .select({
        eventId: singleRankedResults.eventId,
        eventName: event.name,
        overallBest: singleRankedResults.best,
        personName: person.name,
        personGender: person.gender,
        personState: state.name,
        personId: singleRankedResults.personId,
        competitionId: singleRankedResults.competitionId,
        competitionName: competition.name,
        resultId: singleRankedResults.resultId,
      })
      .from(singleRankedResults)
      .innerJoin(person, eq(singleRankedResults.personId, person.wcaId))
      .innerJoin(event, eq(singleRankedResults.eventId, event.id))
      .innerJoin(
        competition,
        eq(singleRankedResults.competitionId, competition.id),
      )
      .leftJoin(state, eq(person.stateId, state.id))
      .where(and(eq(singleRankedResults.rowNum, 1)))
      .orderBy(event.rank);

    const averageRankedResults = tx.$with("ranked_results").as(
      tx
        .select({
          eventId: result.eventId,
          personId: result.personId,
          best: result.average,
          competitionId: result.competitionId,
          resultId: result.id,
          rowNum:
            sql<number>`row_number() OVER (PARTITION BY ${result.eventId} ORDER BY ${result.average} ASC)`.as(
              "rn",
            ),
        })
        .from(result)
        .innerJoin(person, eq(result.personId, person.wcaId))
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(averageWhere),
    );

    const averageRecords = await tx
      .with(averageRankedResults)
      .select({
        eventId: averageRankedResults.eventId,
        eventName: event.name,
        overallBest: averageRankedResults.best,
        personName: person.name,
        personGender: person.gender,
        personState: state.name,
        personId: averageRankedResults.personId,
        competitionId: averageRankedResults.competitionId,
        competitionName: competition.name,
        resultId: averageRankedResults.resultId,
      })
      .from(averageRankedResults)
      .innerJoin(person, eq(averageRankedResults.personId, person.wcaId))
      .innerJoin(event, eq(averageRankedResults.eventId, event.id))
      .innerJoin(
        competition,
        eq(averageRankedResults.competitionId, competition.id),
      )
      .leftJoin(state, eq(person.stateId, state.id))
      .where(and(eq(averageRankedResults.rowNum, 1)))
      .orderBy(event.rank);

    const allResultIds = [
      ...singleRecords.map((r) => r.resultId),
      ...averageRecords.map((r) => r.resultId),
    ];

    const attempts =
      allResultIds.length > 0
        ? await tx
            .select({
              resultId: resultAttempts.resultId,
              attemptNumber: resultAttempts.attemptNumber,
              value: resultAttempts.value,
            })
            .from(resultAttempts)
            .where(inArray(resultAttempts.resultId, allResultIds))
            .orderBy(resultAttempts.attemptNumber)
        : [];

    const attemptsByResultId = attempts.reduce(
      (acc, attempt) => {
        if (!acc[attempt.resultId]) {
          acc[attempt.resultId] = [];
        }
        acc[attempt.resultId]!.push(attempt.value);
        return acc;
      },
      {} as Record<string, number[]>,
    );

    const combinedRecords: CurrentRecord[] = singleRecords.map(
      (singleRecord) => {
        const averageRecord = averageRecords.find(
          (avg) => avg.eventId === singleRecord.eventId,
        );
        return {
          eventName: singleRecord.eventName,
          eventId: singleRecord.eventId,
          single: {
            best: singleRecord.overallBest,
            personId: singleRecord.personId,
            name: singleRecord.personName,
            gender: singleRecord.personGender,
            state: singleRecord.personState,
            competitionId: singleRecord.competitionId,
            competition: singleRecord.competitionName,
            solves: attemptsByResultId[singleRecord.resultId] ?? [],
          },
          average: averageRecord
            ? {
                best: averageRecord.overallBest,
                personId: averageRecord.personId,
                name: averageRecord.personName,
                gender: averageRecord.personGender,
                state: averageRecord.personState,
                competitionId: averageRecord.competitionId,
                competition: averageRecord.competitionName,
                solves: attemptsByResultId[averageRecord.resultId] ?? [],
              }
            : null,
        };
      },
    );

    return combinedRecords;
  });

  return combinedRecords;
}

export async function getRecordHistory(
  input: GetRecordsSchema,
): Promise<RecordHistoryEntry[]> {
  const asOfKey = input.asOf || "all";
  cacheLife("days");
  cacheTag(`records-history-${asOfKey}`);
  cacheTag("records");

  const isStateFilter = Boolean(input.state);
  const regionalRecordMarkers = ["NR", "NAR", "WR"] as const;
  const isRegionalMarker = (marker: string | null | undefined) =>
    marker != null &&
    (regionalRecordMarkers as readonly string[]).includes(marker);

  // State history mirrors WCA country history: higher markers (NR/NAR/WR) count
  // as state records even though state_* is not dual-tagged on write.
  const recordCondition = isStateFilter
    ? or(
        eq(result.stateSingleRecord, "SR"),
        eq(result.stateAverageRecord, "SR"),
        inArray(result.regionalSingleRecord, [...regionalRecordMarkers]),
        inArray(result.regionalAverageRecord, [...regionalRecordMarkers]),
      )
    : or(
        eq(result.regionalSingleRecord, "NR"),
        eq(result.regionalAverageRecord, "NR"),
      );

  const where = and(
    recordCondition,
    input.state ? eq(state.name, input.state) : undefined,
    input.gender ? eq(person.gender, input.gender) : undefined,
    input.event ? eq(result.eventId, input.event) : undefined,
    notInArray(result.eventId, EXCLUDED_EVENTS),
    competitionAsOfCondition(input.asOf),
  );

  const rows = await db
    .select({
      resultId: result.id,
      eventId: result.eventId,
      eventName: event.name,
      eventRank: event.rank,
      personId: result.personId,
      personName: person.name,
      personState: state.name,
      competitionId: competition.id,
      competitionName: competition.name,
      recordDate: recordDateSql,
      roundTypeId: result.roundTypeId,
      best: result.best,
      average: result.average,
      regionalSingleRecord: result.regionalSingleRecord,
      regionalAverageRecord: result.regionalAverageRecord,
      stateSingleRecord: result.stateSingleRecord,
      stateAverageRecord: result.stateAverageRecord,
    })
    .from(result)
    .innerJoin(person, eq(result.personId, person.wcaId))
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(state, eq(person.stateId, state.id))
    .leftJoin(
      competitionRoundDate,
      and(
        eq(competitionRoundDate.competitionId, result.competitionId),
        eq(competitionRoundDate.eventId, result.eventId),
        eq(competitionRoundDate.roundTypeId, result.roundTypeId),
      ),
    )
    .where(where)
    .orderBy(desc(recordDateSql), event.rank);

  if (rows.length === 0) return [];

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
        rows.map((r) => r.resultId),
      ),
    )
    .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

  const attemptsByResultId = attempts.reduce((acc, attempt) => {
    const values = acc.get(attempt.resultId) ?? [];
    values.push(attempt.value);
    acc.set(attempt.resultId, values);
    return acc;
  }, new Map<string, number[]>());

  return rows.map((row) => {
    const isSingleRecord = isStateFilter
      ? row.stateSingleRecord === "SR" ||
        isRegionalMarker(row.regionalSingleRecord)
      : row.regionalSingleRecord === "NR";
    const isAverageRecord = isStateFilter
      ? row.stateAverageRecord === "SR" ||
        isRegionalMarker(row.regionalAverageRecord)
      : row.regionalAverageRecord === "NR";

    return {
      resultId: row.resultId,
      eventId: row.eventId,
      eventName: row.eventName,
      eventRank: row.eventRank,
      personId: row.personId,
      personName: row.personName,
      personState: row.personState,
      competitionId: row.competitionId,
      competitionName: row.competitionName,
      recordDate: toDateKey(row.recordDate),
      roundTypeId: row.roundTypeId,
      best: row.best,
      average: row.average,
      isSingleRecord,
      isAverageRecord,
      solves: attemptsByResultId.get(row.resultId) ?? [],
    };
  });
}

export type RecentNationalRecord = {
  resultId: string;
  eventId: string;
  eventName: string;
  personId: string;
  personName: string | null;
  personState: string | null;
  competitionId: string;
  competitionName: string;
  recordDate: string;
  type: "single" | "average";
  value: number;
};

export async function getRecentNationalRecords(
  limit = 5,
): Promise<RecentNationalRecord[]> {
  cacheLife("days");
  cacheTag("records");

  const rows = await db
    .select({
      resultId: result.id,
      eventId: result.eventId,
      eventName: event.name,
      personId: result.personId,
      personName: person.name,
      personState: state.name,
      competitionId: competition.id,
      competitionName: competition.name,
      recordDate: recordDateSql,
      best: result.best,
      average: result.average,
      regionalSingleRecord: result.regionalSingleRecord,
      regionalAverageRecord: result.regionalAverageRecord,
    })
    .from(result)
    .innerJoin(person, eq(result.personId, person.wcaId))
    .innerJoin(event, eq(result.eventId, event.id))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(state, eq(person.stateId, state.id))
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
        or(
          eq(result.regionalSingleRecord, "NR"),
          eq(result.regionalAverageRecord, "NR"),
        ),
        notInArray(result.eventId, EXCLUDED_EVENTS),
      ),
    )
    .orderBy(desc(recordDateSql), event.rank)
    .limit(limit * 2);

  const recent: RecentNationalRecord[] = [];

  for (const row of rows) {
    const base = {
      resultId: row.resultId,
      eventId: row.eventId,
      eventName: row.eventName,
      personId: row.personId,
      personName: row.personName,
      personState: row.personState,
      competitionId: row.competitionId,
      competitionName: row.competitionName,
      recordDate: toDateKey(row.recordDate),
    };

    if (row.regionalSingleRecord === "NR" && row.best > 0) {
      recent.push({ ...base, type: "single", value: row.best });
    }
    if (row.regionalAverageRecord === "NR" && row.average > 0) {
      recent.push({ ...base, type: "average", value: row.average });
    }
    if (recent.length >= limit) break;
  }

  return recent.slice(0, limit);
}
