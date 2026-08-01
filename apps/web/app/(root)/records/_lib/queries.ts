"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  event,
  state,
  person,
  result,
  competition,
  resultAttempts,
} from "@workspace/db/schema";
import { and, eq, gt, notInArray, sql, inArray } from "drizzle-orm";
import { EXCLUDED_EVENTS } from "@/lib/constants";
import { GetRecordsSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getRecords(input: GetRecordsSchema) {
  cacheLife("days");
  cacheTag("records");

  try {
    const singleWhere = and(
      input.state ? eq(state.name, input.state) : undefined,
      input.gender ? eq(person.gender, input.gender) : undefined,
      notInArray(result.eventId, EXCLUDED_EVENTS),
      gt(result.best, 0),
    );

    const averageWhere = and(
      input.state ? eq(state.name, input.state) : undefined,
      input.gender ? eq(person.gender, input.gender) : undefined,
      notInArray(result.eventId, EXCLUDED_EVENTS),
      gt(result.average, 0),
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

      // Collect all result IDs to fetch attempts
      const allResultIds = [
        ...singleRecords.map((r) => r.resultId),
        ...averageRecords.map((r) => r.resultId),
      ];

      // Fetch all attempts for the record results
      const attempts = await tx
        .select({
          resultId: resultAttempts.resultId,
          attemptNumber: resultAttempts.attemptNumber,
          value: resultAttempts.value,
        })
        .from(resultAttempts)
        .where(inArray(resultAttempts.resultId, allResultIds))
        .orderBy(resultAttempts.attemptNumber);

      // Group attempts by resultId
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

      const combinedRecords = singleRecords.map((singleRecord) => {
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
      });

      return combinedRecords;
    });

    return combinedRecords;
  } catch (err) {
    console.error(err);
    return [];
  }
}
