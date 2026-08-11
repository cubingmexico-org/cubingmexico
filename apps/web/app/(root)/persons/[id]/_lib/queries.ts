import "server-only";
import { db } from "@workspace/db";
import { roundRank } from "@/lib/utils";
import {
  championship,
  competition,
  competitionDelegate,
  competitionOrganizer,
  delegate,
  organizer,
  person,
  rankAverage,
  rankSingle,
  result,
  resultAttempts,
  state,
  event,
  team,
} from "@workspace/db/schema";
import {
  SPEEDSOLVING_AVERAGES_EVENTS,
  BLD_FMC_MEANS_EVENTS,
} from "@/lib/constants";
import type {
  DelegateStatus,
  Medals,
  Records,
  WcaPersonResponse,
} from "@/types/wca";
import {
  getOrganizerLevel,
  recentOrganizedCompetitionCountSql,
  type OrganizerLevel,
} from "@/lib/organizer-level";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gt,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export type { OrganizerLevel };

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

type RecordWithStateRank = {
  id: number;
  personId: string;
  eventId: string;
  best: number;
  worldRank: number;
  continentRank: number;
  countryRank: number;
  stateRank: number | null;
};

export type PersonalRecordWithStateRank = {
  single: RecordWithStateRank;
  average?: RecordWithStateRank;
};

export type MembershipData = {
  numberOfSpeedsolvingAverages: number;
  numberOfBLDFMCMeans: number;
  hasWorldRecord: boolean;
  hasWorldChampionshipPodium: boolean;
  eventsWon: number;
} | null;

export type OrganizerStatus = {
  organizedCompetitionCount: number;
  level: OrganizerLevel;
} | null;

export async function getPersonData(wcaId: string): Promise<{
  person: {
    wcaId: string;
    name: string | null;
    gender: string | null;
    delegateStatus: DelegateStatus;
    state: string | null;
  };
  team: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  competitionCount: number;
  solveCount: number;
  personalRecords: Record<string, PersonalRecordWithStateRank>;
  medals: Medals;
  regionalRecords: Records;
} | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-data-${wcaId}`);

  try {
    const personDataRow = await db
      .select({
        name: person.name,
        gender: person.gender,
        wcaId: person.wcaId,
        state: state.name,
        stateId: person.stateId,
        teamName: team.name,
        teamImage: team.image,
      })
      .from(person)
      .leftJoin(state, eq(person.stateId, state.id))
      .leftJoin(team, eq(person.stateId, team.stateId))
      .where(eq(person.wcaId, wcaId))
      .then((res) => res[0]);

    if (!personDataRow) return null;

    const delegateRow = await db
      .select({ level: delegate.level })
      .from(delegate)
      .where(and(eq(delegate.personId, wcaId), eq(delegate.status, "active")))
      .limit(1)
      .then((res) => res[0]);

    const competitionCountRow = await db
      .select({
        competitionCount: sql<number>`COUNT(DISTINCT ${result.competitionId})`,
      })
      .from(result)
      .where(eq(result.personId, wcaId));

    const competitionCount = Number(
      competitionCountRow[0]?.competitionCount ?? 0,
    );

    const solveCountRow = await db
      .select({
        solveCount: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0)`,
      })
      .from(result)
      .innerJoin(resultAttempts, eq(resultAttempts.resultId, result.id))
      .where(eq(result.personId, wcaId));

    const solveCount = Number(solveCountRow[0]?.solveCount ?? 0);

    const medalsRow = await db
      .select({
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1 AND ${result.roundTypeId} IN('f','c'))`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2 AND ${result.roundTypeId} IN('f','c'))`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3 AND ${result.roundTypeId} IN('f','c'))`,
      })
      .from(result)
      .where(and(eq(result.personId, wcaId), gt(result.best, 0)));

    const medals = {
      gold: Number(medalsRow[0]?.gold ?? 0),
      silver: Number(medalsRow[0]?.silver ?? 0),
      bronze: Number(medalsRow[0]?.bronze ?? 0),
      total:
        Number(medalsRow[0]?.gold ?? 0) +
        Number(medalsRow[0]?.silver ?? 0) +
        Number(medalsRow[0]?.bronze ?? 0),
    };

    const recordsRow = await db
      .select({
        world: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'WR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END))`,
        continental: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NAR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NAR' THEN 1 ELSE 0 END))`,
        national: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NR' THEN 1 ELSE 0 END))`,
        state: sql<number>`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))`,
      })
      .from(result)
      .where(eq(result.personId, wcaId));

    const regionalRecords = {
      world: Number(recordsRow[0]?.world ?? 0),
      continental: Number(recordsRow[0]?.continental ?? 0),
      national: Number(recordsRow[0]?.national ?? 0),
      state: Number(recordsRow[0]?.state ?? 0),
      total:
        Number(recordsRow[0]?.world ?? 0) +
        Number(recordsRow[0]?.continental ?? 0) +
        Number(recordsRow[0]?.national ?? 0),
    };

    const singles = await db
      .select({
        eventId: rankSingle.eventId,
        best: rankSingle.best,
        worldRank: rankSingle.worldRank,
        continentRank: rankSingle.continentRank,
        countryRank: rankSingle.countryRank,
        stateRank: rankSingle.stateRank,
      })
      .from(rankSingle)
      .where(eq(rankSingle.personId, wcaId));

    const averages = await db
      .select({
        eventId: rankAverage.eventId,
        best: rankAverage.best,
        worldRank: rankAverage.worldRank,
        continentRank: rankAverage.continentRank,
        countryRank: rankAverage.countryRank,
        stateRank: rankAverage.stateRank,
      })
      .from(rankAverage)
      .where(eq(rankAverage.personId, wcaId));

    const personalRecords: Record<string, PersonalRecordWithStateRank> = {};

    for (const s of singles) {
      const existingRecord =
        personalRecords[s.eventId] ?? ({} as PersonalRecordWithStateRank);
      existingRecord.single = {
        id: 0,
        personId: wcaId,
        eventId: s.eventId,
        best: s.best,
        worldRank: s.worldRank ?? 0,
        continentRank: s.continentRank ?? 0,
        countryRank: s.countryRank ?? 0,
        stateRank: s.stateRank,
      };
      personalRecords[s.eventId] = existingRecord;
    }

    for (const a of averages) {
      const existingRecord =
        personalRecords[a.eventId] ?? ({} as PersonalRecordWithStateRank);
      existingRecord.average = {
        id: 0,
        personId: wcaId,
        eventId: a.eventId,
        best: a.best,
        worldRank: a.worldRank ?? 0,
        continentRank: a.continentRank ?? 0,
        countryRank: a.countryRank ?? 0,
        stateRank: a.stateRank,
      };
      personalRecords[a.eventId] = existingRecord;
    }

    const resultObject = {
      person: {
        wcaId: personDataRow.wcaId,
        name: personDataRow.name,
        gender: personDataRow.gender,
        delegateStatus: delegateRow?.level ?? null,
        state: personDataRow.state ?? null,
      },
      team:
        personDataRow.stateId && personDataRow.teamName
          ? {
              id: personDataRow.stateId,
              name: personDataRow.teamName,
              image: personDataRow.teamImage ?? null,
            }
          : null,
      competitionCount,
      solveCount,
      personalRecords,
      medals,
      regionalRecords,
    };

    return resultObject;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getMembershipData(wcaId: string, eventIds: string[]) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`membership-data-${wcaId}`);

  try {
    const data = await db
      .select({
        numberOfSpeedsolvingAverages: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(SPEEDSOLVING_AVERAGES_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
        numberOfBLDFMCMeans: sql<number>`COUNT(DISTINCT CASE WHEN ${result.eventId} IN(${sql.join(BLD_FMC_MEANS_EVENTS, sql`, `)}) AND ${result.average} > 0 THEN ${result.eventId} ELSE NULL END)`,
        hasWorldRecord: sql<boolean>`MAX(CASE WHEN ${result.regionalSingleRecord} = 'WR' OR ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END) = 1`,
        hasWorldChampionshipPodium: sql<boolean>`MAX(CASE WHEN ${result.pos} IN(1, 2, 3) AND ${result.roundTypeId} IN('f', 'c') AND ${championship.championshipType} = 'world' THEN 1 ELSE 0 END) = 1`,
        eventsWon: sql<number>`COUNT(DISTINCT CASE WHEN ${result.pos} = 1 AND ${result.roundTypeId} IN('f', 'c') THEN ${result.eventId} ELSE NULL END)`,
      })
      .from(result)
      .leftJoin(
        championship,
        eq(result.competitionId, championship.competitionId),
      )
      .where(
        and(
          eq(result.personId, wcaId),
          inArray(result.eventId, eventIds),
          gt(result.best, 0),
        ),
      )
      .having(eq(countDistinct(result.eventId), eventIds.length));

    return data[0] ?? null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getOrganizerStatus(
  wcaId: string,
): Promise<OrganizerStatus> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`organizer-status-${wcaId}`);

  try {
    const data = await db
      .select({
        recentCompetitionCount: recentOrganizedCompetitionCountSql(),
      })
      .from(organizer)
      .leftJoin(
        competitionOrganizer,
        eq(competitionOrganizer.organizerId, organizer.id),
      )
      .leftJoin(
        competition,
        eq(competitionOrganizer.competitionId, competition.id),
      )
      .where(and(eq(organizer.personId, wcaId), eq(organizer.status, "active")))
      .then((res) => res[0]);

    const recentCompetitionCount = Number(data?.recentCompetitionCount ?? 0);

    if (recentCompetitionCount === 0) {
      return null;
    }

    const personRow = await db
      .select({ gender: person.gender })
      .from(person)
      .where(eq(person.wcaId, wcaId))
      .then((res) => res[0]);

    const gender = personRow?.gender ?? null;
    const level = getOrganizerLevel(recentCompetitionCount, gender);

    return {
      organizedCompetitionCount: recentCompetitionCount,
      level,
    };
  } catch (err) {
    console.error(err);
    return null;
  }
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

  try {
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
  } catch (err) {
    console.error(err);
    return { organized: [], delegated: [] };
  }
}

export async function getPersonCompetitionEventOptions(wcaId: string) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-competition-event-options-${wcaId}`);

  try {
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
  } catch (err) {
    console.error(err);
    return [] satisfies PersonResultsEventOption[];
  }
}

export async function getPersonCompetitionLocations(wcaId: string) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-competition-locations-${wcaId}`);

  try {
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
  } catch (err) {
    console.error(err);
    return [] satisfies PersonCompetitionLocation[];
  }
}

export async function getPersonCompetitionResults(
  wcaId: string,
  eventId: string,
) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-competition-results-${wcaId}`);

  try {
    const rows = await db
      .select({
        resultId: result.id,
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        competitionId: competition.id,
        competitionName: competition.name,
        competitionStartDate: competition.startDate,
        roundTypeId: result.roundTypeId,
        position: result.pos,
        best: result.best,
        average: result.average,
      })
      .from(result)
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(and(eq(result.personId, wcaId), eq(result.eventId, eventId)))
      .orderBy(
        event.rank,
        desc(competition.startDate),
        result.pos,
        result.best,
      );

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
        competitionStartDate: row.competitionStartDate.toISOString(),
        solves: attemptsByResultId.get(row.resultId) ?? [],
      });

      accumulator.set(row.eventId, eventGroup);
      return accumulator;
    }, new Map<string, PersonResultsByEventGroup>());

    const [selectedEventGroup] = Array.from(grouped.values())
      .map((group) => ({
        ...group,
        results: group.results.slice().sort((left, right) => {
          const startDateDelta =
            Date.parse(right.competitionStartDate) -
            Date.parse(left.competitionStartDate);

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
        const dateDelta =
          Date.parse(a.competitionStartDate) -
          Date.parse(b.competitionStartDate);
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
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getPersonDataFromWCA(
  wcaId: string,
): Promise<WcaPersonResponse | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-data-wca-${wcaId}`);

  try {
    const response = await fetch(
      `https://www.worldcubeassociation.org/api/v0/persons/${wcaId}`,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch person data from WCA API: ${response.statusText}`,
      );
    }

    const data = await response.json();

    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

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

/** Mexican Nationals, North American Championship, and World Championship. */
const FEATURED_CHAMPIONSHIP_TYPES = ["MX", "_North America", "world"] as const;

/**
 * Re-rank finals among eligible competitors (WCA tie-preserving).
 * For MX nationals the DB only stores Mexican results, so this matches
 * nationality-based championship places when foreigners finished ahead.
 */
function assignChampionshipPositions<
  T extends { resultId: string; pos: number | null },
>(rows: T[]): (T & { championshipPosition: number })[] {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.pos ?? Number.MAX_SAFE_INTEGER) - (b.pos ?? Number.MAX_SAFE_INTEGER),
  );

  let previousOldPos: number | null = null;
  let previousNewPos = 0;

  return sorted.map((row, index) => {
    const oldPos = row.pos ?? Number.MAX_SAFE_INTEGER;
    const championshipPosition =
      oldPos === previousOldPos ? previousNewPos : index + 1;
    previousOldPos = oldPos;
    previousNewPos = championshipPosition;
    return { ...row, championshipPosition };
  });
}

export type PersonChampionshipPodium = {
  resultId: string;
  eventId: string;
  eventName: string;
  eventRank: number;
  competitionId: string;
  competitionName: string;
  competitionStartDate: string;
  championshipType: string;
  roundTypeId: string | null;
  position: number | null;
  best: number;
  average: number;
  solves: number[];
};

export async function getPersonRecordHistory(
  wcaId: string,
): Promise<PersonRecordHistoryEntry[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-record-history-${wcaId}`);

  try {
    const rows = await db
      .select({
        resultId: result.id,
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        competitionId: competition.id,
        competitionName: competition.name,
        competitionStartDate: competition.startDate,
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
      .orderBy(event.rank, desc(competition.startDate));

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

    return rows.map((row) => ({
      ...row,
      competitionStartDate: row.competitionStartDate.toISOString(),
      solves: attemptsByResultId.get(row.resultId) ?? [],
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getPersonChampionshipPodiums(
  wcaId: string,
): Promise<PersonChampionshipPodium[]> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-championship-podiums-${wcaId}`);

  try {
    const rows = await db
      .select({
        resultId: result.id,
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        competitionId: competition.id,
        competitionName: competition.name,
        competitionStartDate: competition.startDate,
        championshipType: championship.championshipType,
        roundTypeId: result.roundTypeId,
        position: result.pos,
        best: result.best,
        average: result.average,
      })
      .from(result)
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(championship, eq(championship.competitionId, competition.id))
      .where(
        and(
          eq(result.personId, wcaId),
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          inArray(championship.championshipType, [
            ...FEATURED_CHAMPIONSHIP_TYPES,
          ]),
        ),
      )
      .orderBy(desc(competition.startDate), event.rank);

    if (rows.length === 0) return [];

    const mxCompetitionIds = [
      ...new Set(
        rows
          .filter((row) => row.championshipType === "MX")
          .map((row) => row.competitionId),
      ),
    ];

    const mxChampionshipPosByResultId = new Map<string, number>();

    if (mxCompetitionIds.length > 0) {
      const peers = await db
        .select({
          resultId: result.id,
          competitionId: result.competitionId,
          eventId: result.eventId,
          roundTypeId: result.roundTypeId,
          pos: result.pos,
        })
        .from(result)
        .innerJoin(
          championship,
          eq(championship.competitionId, result.competitionId),
        )
        .where(
          and(
            inArray(result.competitionId, mxCompetitionIds),
            inArray(result.roundTypeId, ["f", "c"]),
            gt(result.best, 0),
            eq(championship.championshipType, "MX"),
          ),
        );

      const peersByFinal = peers.reduce((acc, peer) => {
        const key = `${peer.competitionId}:${peer.eventId}:${peer.roundTypeId ?? ""}`;
        const list = acc.get(key) ?? [];
        list.push(peer);
        acc.set(key, list);
        return acc;
      }, new Map<string, typeof peers>());

      for (const group of peersByFinal.values()) {
        for (const ranked of assignChampionshipPositions(group)) {
          if (ranked.championshipPosition <= 3) {
            mxChampionshipPosByResultId.set(
              ranked.resultId,
              ranked.championshipPosition,
            );
          }
        }
      }
    }

    const podiumRows = rows.flatMap((row) => {
      if (row.championshipType === "MX") {
        const championshipPosition = mxChampionshipPosByResultId.get(
          row.resultId,
        );
        if (championshipPosition === undefined) return [];
        return [{ ...row, position: championshipPosition }];
      }

      if (row.position != null && row.position >= 1 && row.position <= 3) {
        return [row];
      }

      return [];
    });

    if (podiumRows.length === 0) return [];

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
          podiumRows.map((r) => r.resultId),
        ),
      )
      .orderBy(resultAttempts.resultId, resultAttempts.attemptNumber);

    const attemptsByResultId = attempts.reduce((acc, attempt) => {
      const values = acc.get(attempt.resultId) ?? [];
      values.push(attempt.value);
      acc.set(attempt.resultId, values);
      return acc;
    }, new Map<string, number[]>());

    return podiumRows.map((row) => ({
      ...row,
      competitionStartDate: row.competitionStartDate.toISOString(),
      solves: attemptsByResultId.get(row.resultId) ?? [],
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function hasPersonChampionshipPodiums(
  wcaId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-championship-podiums-${wcaId}`);

  try {
    const rows = await db
      .select({
        resultId: result.id,
        competitionId: result.competitionId,
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        championshipType: championship.championshipType,
        position: result.pos,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(championship, eq(championship.competitionId, competition.id))
      .where(
        and(
          eq(result.personId, wcaId),
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          inArray(championship.championshipType, [
            ...FEATURED_CHAMPIONSHIP_TYPES,
          ]),
        ),
      );

    if (rows.length === 0) return false;

    const hasAbsolutePodium = rows.some(
      (row) =>
        row.championshipType !== "MX" &&
        row.position != null &&
        row.position >= 1 &&
        row.position <= 3,
    );
    if (hasAbsolutePodium) return true;

    const mxCompetitionIds = [
      ...new Set(
        rows
          .filter((row) => row.championshipType === "MX")
          .map((row) => row.competitionId),
      ),
    ];
    if (mxCompetitionIds.length === 0) return false;

    const peers = await db
      .select({
        resultId: result.id,
        competitionId: result.competitionId,
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        pos: result.pos,
      })
      .from(result)
      .innerJoin(
        championship,
        eq(championship.competitionId, result.competitionId),
      )
      .where(
        and(
          inArray(result.competitionId, mxCompetitionIds),
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          eq(championship.championshipType, "MX"),
        ),
      );

    const personResultIds = new Set(
      rows
        .filter((row) => row.championshipType === "MX")
        .map((row) => row.resultId),
    );

    const peersByFinal = peers.reduce((acc, peer) => {
      const key = `${peer.competitionId}:${peer.eventId}:${peer.roundTypeId ?? ""}`;
      const list = acc.get(key) ?? [];
      list.push(peer);
      acc.set(key, list);
      return acc;
    }, new Map<string, typeof peers>());

    for (const group of peersByFinal.values()) {
      for (const ranked of assignChampionshipPositions(group)) {
        if (
          ranked.championshipPosition <= 3 &&
          personResultIds.has(ranked.resultId)
        ) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function hasPersonStaffCompetitions(
  wcaId: string,
): Promise<boolean> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-staff-competitions-${wcaId}`);

  try {
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
  } catch (err) {
    console.error(err);
    return false;
  }
}

export type PersonPrStreakCompetition = {
  competitionId: string;
  competitionName: string;
  startDate: string;
  endDate: string;
};

export type PersonPrStreaks = {
  currentStreak: PersonPrStreakCompetition[];
  longestStreak: PersonPrStreakCompetition[];
};

function isPersonalRecord(
  eventId: string,
  value: number,
  records: Record<string, number>,
): boolean {
  if (value === 0 || value === -1) {
    return false;
  }
  if (records[eventId] === undefined) {
    return true;
  }
  return value <= records[eventId]!;
}

export async function getPersonPrStreaks(
  wcaId: string,
): Promise<PersonPrStreaks> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-pr-streaks-${wcaId}`);

  try {
    const rows = await db
      .select({
        competitionId: result.competitionId,
        eventId: result.eventId,
        best: result.best,
        average: result.average,
        competitionName: competition.name,
        startDate: competition.startDate,
        endDate: competition.endDate,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(eq(result.personId, wcaId))
      .orderBy(asc(competition.startDate), asc(result.competitionId));

    if (rows.length === 0) {
      return { currentStreak: [], longestStreak: [] };
    }

    type CompMeta = {
      competitionId: string;
      competitionName: string;
      startDate: Date;
      endDate: Date;
      results: Array<{ eventId: string; best: number; average: number }>;
    };

    const competitions: CompMeta[] = [];
    let currentComp: CompMeta | null = null;

    for (const row of rows) {
      if (!currentComp || currentComp.competitionId !== row.competitionId) {
        currentComp = {
          competitionId: row.competitionId,
          competitionName: row.competitionName,
          startDate: row.startDate,
          endDate: row.endDate,
          results: [],
        };
        competitions.push(currentComp);
      }
      currentComp.results.push({
        eventId: row.eventId,
        best: row.best,
        average: row.average,
      });
    }

    const bestSingles: Record<string, number> = {};
    const bestAverages: Record<string, number> = {};
    let currentStreak: PersonPrStreakCompetition[] = [];
    let longestStreak: PersonPrStreakCompetition[] = [];

    for (const comp of competitions) {
      let recordAttained = false;

      for (const entry of comp.results) {
        if (isPersonalRecord(entry.eventId, entry.best, bestSingles)) {
          bestSingles[entry.eventId] = entry.best;
          recordAttained = true;
        }
        if (isPersonalRecord(entry.eventId, entry.average, bestAverages)) {
          bestAverages[entry.eventId] = entry.average;
          recordAttained = true;
        }
      }

      const streakComp: PersonPrStreakCompetition = {
        competitionId: comp.competitionId,
        competitionName: comp.competitionName,
        startDate: comp.startDate.toISOString(),
        endDate: comp.endDate.toISOString(),
      };

      if (recordAttained) {
        currentStreak = [...currentStreak, streakComp];
        if (currentStreak.length > longestStreak.length) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = [];
      }
    }

    return { currentStreak, longestStreak };
  } catch (err) {
    console.error(err);
    return { currentStreak: [], longestStreak: [] };
  }
}
