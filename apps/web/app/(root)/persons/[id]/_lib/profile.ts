import "server-only";

import { db } from "@workspace/db";
import {
  championship,
  competition,
  competitionOrganizer,
  delegate,
  organizer,
  person,
  rankAverage,
  rankSingle,
  result,
  resultAttempts,
  state,
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
import { and, countDistinct, eq, gt, inArray, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

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
}

export async function getMembershipData(wcaId: string, eventIds: string[]) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`membership-data-${wcaId}`);

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
}

export async function getOrganizerStatus(
  wcaId: string,
): Promise<OrganizerStatus> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`organizer-status-${wcaId}`);

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
}

export async function getPersonDataFromWCA(
  wcaId: string,
): Promise<WcaPersonResponse | null> {
  "use cache";
  cacheLife("weeks");
  cacheTag(`person-data-wca-${wcaId}`);

  const response = await fetch(
    `https://www.worldcubeassociation.org/api/v0/persons/${wcaId}`,
  );

  if (response.status === 404) {
    return null;
  }

  // Throw instead of returning null so transient failures (429, 5xx) are not cached.
  if (!response.ok) {
    throw new Error(`WCA API responded ${response.status} for person ${wcaId}`);
  }

  const data = await response.json();

  return data;
}

export async function getPersonAvatarFromWCA(
  wcaId: string,
): Promise<WcaPersonResponse | null> {
  try {
    return await getPersonDataFromWCA(wcaId);
  } catch (error) {
    console.error(`Failed to fetch WCA data for person ${wcaId}`, error);
    return null;
  }
}
