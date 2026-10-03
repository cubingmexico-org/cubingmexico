import "server-only";

import { db } from "@workspace/db";
import { roundRank } from "@/lib/utils";
import {
  competition,
  competitionDelegate,
  competitionOrganizer,
  competitionRoundDate,
  delegate,
  organizer,
  result,
  resultAttempts,
  state,
  event,
} from "@workspace/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { recordDateSql, toDateKey } from "@/lib/record-date";

export interface PersonCompetitionLocation {
  id: string;
  name: string;
  stateId: string | null;
  stateName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type PersonStaffCompetition = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  stateId: string | null;
  stateName: string | null;
  cityName: string;
  cancelled: boolean;
};

type PersonCompetitionResultRow = {
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
  solves: number[];
  // Indicates this result set a personal record at the time (history)
  isPersonalRecordSingle?: boolean;
  isPersonalRecordAverage?: boolean;
};

export interface PersonResultsByEventGroup {
  eventId: string;
  eventName: string;
  eventRank: number;
  results: PersonCompetitionResultRow[];
}

export interface PersonResultsEventOption {
  eventId: string;
  eventName: string;
  eventRank: number;
}

const staffCompetitionSelect = {
  id: competition.id,
  name: competition.name,
  startDate: competition.startDate,
  endDate: competition.endDate,
  stateId: competition.stateId,
  stateName: state.name,
  cityName: competition.cityName,
  cancelled: competition.cancelled,
};

export async function getPersonStaffCompetitions(wcaId: string): Promise<{
  organized: PersonStaffCompetition[];
  delegated: PersonStaffCompetition[];
}> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-staff-competitions-${wcaId}`);

  const [organized, delegated] = await Promise.all([
    db
      .select(staffCompetitionSelect)
      .from(organizer)
      .innerJoin(
        competitionOrganizer,
        eq(competitionOrganizer.organizerId, organizer.id),
      )
      .innerJoin(
        competition,
        eq(competitionOrganizer.competitionId, competition.id),
      )
      .leftJoin(state, eq(competition.stateId, state.id))
      .where(eq(organizer.personId, wcaId))
      .groupBy(
        competition.id,
        competition.name,
        competition.startDate,
        competition.endDate,
        competition.stateId,
        state.name,
        competition.cityName,
        competition.cancelled,
      )
      .orderBy(desc(competition.startDate)),
    db
      .select(staffCompetitionSelect)
      .from(delegate)
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .innerJoin(
        competition,
        eq(competitionDelegate.competitionId, competition.id),
      )
      .leftJoin(state, eq(competition.stateId, state.id))
      .where(eq(delegate.personId, wcaId))
      .groupBy(
        competition.id,
        competition.name,
        competition.startDate,
        competition.endDate,
        competition.stateId,
        state.name,
        competition.cityName,
        competition.cancelled,
      )
      .orderBy(desc(competition.startDate)),
  ]);

  return { organized, delegated };
}

export async function getPersonCompetitionEventOptions(wcaId: string) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-competition-event-options-${wcaId}`);

  return await db
    .select({
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
    })
    .from(result)
    .innerJoin(event, eq(result.eventId, event.id))
    .where(eq(result.personId, wcaId))
    .groupBy(event.id, event.name, event.rank)
    .orderBy(event.rank);
}

export async function getPersonCompetitionLocations(wcaId: string) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-competition-locations-${wcaId}`);

  return await db
    .select({
      id: competition.id,
      name: competition.name,
      stateId: competition.stateId,
      stateName: state.name,
      latitude: competition.latitudeMicrodegrees,
      longitude: competition.longitudeMicrodegrees,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .leftJoin(state, eq(competition.stateId, state.id))
    .where(eq(result.personId, wcaId))
    .groupBy(
      competition.id,
      competition.name,
      state.name,
      competition.latitudeMicrodegrees,
      competition.longitudeMicrodegrees,
    )
    .orderBy(desc(competition.startDate));
}

export async function getPersonCompetitionResults(
  wcaId: string,
  eventId: string,
) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-competition-results-${wcaId}`);

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
    .where(and(eq(result.personId, wcaId), eq(result.eventId, eventId)))
    .orderBy(event.rank, desc(recordDateSql), result.pos, result.best);

  if (rows.length === 0) {
    return null;
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

  const grouped = rows.reduce((accumulator, row) => {
    const eventGroup = accumulator.get(row.eventId) ?? {
      eventId: row.eventId,
      eventName: row.eventName,
      eventRank: row.eventRank,
      results: [] as PersonCompetitionResultRow[],
    };

    eventGroup.results.push({
      ...row,
      competitionStartDate: toDateKey(row.competitionStartDate),
      solves: attemptsByResultId.get(row.resultId) ?? [],
    });

    accumulator.set(row.eventId, eventGroup);
    return accumulator;
  }, new Map<string, PersonResultsByEventGroup>());

  const [selectedEventGroup] = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      results: group.results.slice().sort((left, right) => {
        const startDateDelta = right.competitionStartDate.localeCompare(
          left.competitionStartDate,
        );

        if (startDateDelta !== 0) {
          return startDateDelta;
        }

        const roundDelta =
          roundRank(left.roundTypeId) - roundRank(right.roundTypeId);

        if (roundDelta !== 0) {
          return roundDelta;
        }

        return (
          (left.position ?? 999) - (right.position ?? 999) ||
          left.best - right.best
        );
      }),
    }))
    .sort((left, right) => left.eventRank - right.eventRank);

  // Compute personal record history per event group: iterate chronologically
  if (selectedEventGroup) {
    // Sort ascending by date to walk through history. When dates are equal,
    // order by round properly (first rounds before second rounds before finals),
    // then by position and best as tie-breakers.
    const chronological = selectedEventGroup.results.slice().sort((a, b) => {
      const dateDelta = a.competitionStartDate.localeCompare(
        b.competitionStartDate,
      );
      if (dateDelta !== 0) return dateDelta;

      const roundDelta = roundRank(b.roundTypeId) - roundRank(a.roundTypeId);
      if (roundDelta !== 0) return roundDelta;

      return (a.position ?? 999) - (b.position ?? 999) || a.best - b.best;
    });

    let bestSingleSeen = 0;
    let bestAverageSeen = 0;

    for (const r of chronological) {
      // single: lower is better
      if (r.best > 0 && (bestSingleSeen === 0 || r.best <= bestSingleSeen)) {
        r.isPersonalRecordSingle = true;
        bestSingleSeen = r.best;
      } else {
        r.isPersonalRecordSingle = false;
      }

      // average: lower is better and must be > 0
      if (
        r.average > 0 &&
        (bestAverageSeen === 0 || r.average <= bestAverageSeen)
      ) {
        r.isPersonalRecordAverage = true;
        bestAverageSeen = r.average;
      } else {
        r.isPersonalRecordAverage = false;
      }
    }
  }

  return selectedEventGroup ?? null;
}

export async function hasPersonStaffCompetitions(
  wcaId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-staff-competitions-${wcaId}`);

  const [organized, delegated] = await Promise.all([
    db
      .select({ competitionId: competitionOrganizer.competitionId })
      .from(organizer)
      .innerJoin(
        competitionOrganizer,
        eq(competitionOrganizer.organizerId, organizer.id),
      )
      .where(eq(organizer.personId, wcaId))
      .limit(1),
    db
      .select({ competitionId: competitionDelegate.competitionId })
      .from(delegate)
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .where(eq(delegate.personId, wcaId))
      .limit(1),
  ]);

  return organized.length > 0 || delegated.length > 0;
}
