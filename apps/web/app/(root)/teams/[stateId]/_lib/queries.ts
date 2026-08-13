"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  Person,
  person,
  rankAverage,
  rankSingle,
  result,
  state,
  team,
  teamMember,
} from "@workspace/db/schema";
import {
  and,
  count,
  gt,
  eq,
  inArray,
  notInArray,
  asc,
  desc,
  sql,
  or,
} from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { EXCLUDED_EVENTS } from "@/lib/constants";
import { type GetMembersSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getTeamInfo(stateId: string) {
  cacheLife("days");
  cacheTag(`team-info-${stateId}`);

  const data = await db
    .select({
      name: team.name,
      description: team.description,
      image: team.image,
      coverImage: team.coverImage,
      state: state.name,
      founded: team.founded,
      socialLinks: team.socialLinks,
      isActive: team.isActive,
    })
    .from(team)
    .innerJoin(state, eq(team.stateId, state.id))
    .where(eq(team.stateId, stateId));

  return data[0] ?? null;
}

export async function getTeamShellData(stateId: string) {
  const [teamInfo, totalMembers] = await Promise.all([
    getTeamInfo(stateId),
    getTotalMembers(stateId),
  ]);

  if (!teamInfo) {
    return null;
  }

  return {
    team: teamInfo,
    totalMembers,
  };
}

const OVERVIEW_UPCOMING_LIMIT = 3;
const OVERVIEW_TOP_MEMBERS_LIMIT = 5;
const OVERVIEW_NR_TEASER_LIMIT = 6;

export type TeamMedals = {
  gold: number;
  silver: number;
  bronze: number;
  total: number;
};

export type TeamNationalRecord = {
  eventId: string;
  personId: string;
  personName: string | null;
  value: number;
  type: "single" | "average";
};

export type TeamTopMember = {
  wcaId: string;
  name: string | null;
  podiums: number;
};

export async function getTeamOverviewData(stateId: string) {
  const [
    team,
    competitions,
    medals,
    singleNationalRecords,
    averageNationalRecords,
    topMembers,
  ] = await Promise.all([
    getTeamInfo(stateId),
    getTeamCompetitions(stateId),
    getTeamMedals(stateId),
    getSingleNationalRecords(stateId),
    getAverageNationalRecords(stateId),
    getTopMembersByPodiums(stateId, OVERVIEW_TOP_MEMBERS_LIMIT),
  ]);

  if (!team) {
    return null;
  }

  const now = new Date();
  const upcomingCompetitions = competitions
    .filter((competition) => competition.startDate >= now)
    .slice(0, OVERVIEW_UPCOMING_LIMIT);

  const nationalRecords = mergeNationalRecords(
    singleNationalRecords,
    averageNationalRecords,
  );

  const foundedYear = team.founded
    ? new Date(team.founded).getFullYear()
    : null;

  return {
    team,
    medals,
    competitionsCount: competitions.length,
    activeYears: foundedYear ? new Date().getFullYear() - foundedYear : 0,
    totalNationalRecords: nationalRecords.length,
    nationalRecordsTeaser: nationalRecords.slice(0, OVERVIEW_NR_TEASER_LIMIT),
    topMembers,
    upcomingCompetitions,
  };
}

export async function getTeamStatisticsData(stateId: string) {
  const [
    team,
    competitions,
    medals,
    singleNationalRecords,
    averageNationalRecords,
  ] = await Promise.all([
    getTeamInfo(stateId),
    getTeamCompetitions(stateId),
    getTeamMedals(stateId),
    getSingleNationalRecords(stateId),
    getAverageNationalRecords(stateId),
  ]);

  if (!team) {
    return null;
  }

  const nationalRecords = mergeNationalRecords(
    singleNationalRecords,
    averageNationalRecords,
  );

  const foundedYear = team.founded
    ? new Date(team.founded).getFullYear()
    : new Date().getFullYear();

  return {
    team,
    medals,
    competitionsCount: competitions.length,
    nationalRecords,
    totalNationalRecords: nationalRecords.length,
    activeYears: new Date().getFullYear() - foundedYear,
  };
}

function mergeNationalRecords(
  singles: Awaited<ReturnType<typeof getSingleNationalRecords>>,
  averages: Awaited<ReturnType<typeof getAverageNationalRecords>>,
): TeamNationalRecord[] {
  const singlesMapped: TeamNationalRecord[] = singles.map((record) => ({
    eventId: record.eventId,
    personId: record.personId,
    personName: record.personName,
    value: record.value,
    type: "single" as const,
  }));
  const averagesMapped: TeamNationalRecord[] = averages.map((record) => ({
    eventId: record.eventId,
    personId: record.personId,
    personName: record.personName,
    value: record.value,
    type: "average" as const,
  }));

  return [...singlesMapped, ...averagesMapped].sort((a, b) => {
    if (a.eventId !== b.eventId) return a.eventId.localeCompare(b.eventId);
    if (a.type !== b.type) return a.type === "single" ? -1 : 1;
    return (a.personName ?? "").localeCompare(b.personName ?? "");
  });
}

export async function getTotalMembers(stateId: string) {
  cacheLife("days");
  cacheTag(`total-members-${stateId}`);

  const data = await db
    .select({ count: count() })
    .from(person)
    .where(eq(person.stateId, stateId));

  return data[0]?.count ?? 0;
}

export async function getTeamCompetitions(stateId: string) {
  cacheLife("days");
  cacheTag(`team-competitions-${stateId}`);

  return await db
    .select({
      id: competition.id,
      name: competition.name,
      cityName: competition.cityName,
      venue: competition.venue,
      startDate: competition.startDate,
      endDate: competition.endDate,
      latitudeMicrodegrees: competition.latitudeMicrodegrees,
      longitudeMicrodegrees: competition.longitudeMicrodegrees,
    })
    .from(competition)
    .where(eq(competition.stateId, stateId))
    .orderBy(competition.startDate);
}

export async function getTeamMedals(stateId: string): Promise<TeamMedals> {
  cacheLife("days");
  cacheTag(`team-podiums-${stateId}`);

  const medalsRow = await db
    .select({
      gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1 AND ${result.roundTypeId} IN ('f', 'c'))`,
      silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2 AND ${result.roundTypeId} IN ('f', 'c'))`,
      bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3 AND ${result.roundTypeId} IN ('f', 'c'))`,
    })
    .from(result)
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(and(eq(person.stateId, stateId), gt(result.best, 0)));

  const gold = Number(medalsRow[0]?.gold ?? 0);
  const silver = Number(medalsRow[0]?.silver ?? 0);
  const bronze = Number(medalsRow[0]?.bronze ?? 0);

  return {
    gold,
    silver,
    bronze,
    total: gold + silver + bronze,
  };
}

export async function getSingleNationalRecords(stateId: string) {
  cacheLife("days");
  cacheTag(`single-national-records-${stateId}`);

  return await db
    .select({
      eventId: rankSingle.eventId,
      personId: person.wcaId,
      personName: person.name,
      value: rankSingle.best,
    })
    .from(rankSingle)
    .innerJoin(person, eq(rankSingle.personId, person.wcaId))
    .where(
      and(
        eq(person.stateId, stateId),
        eq(rankSingle.countryRank, 1),
        notInArray(rankSingle.eventId, EXCLUDED_EVENTS),
      ),
    )
    .orderBy(asc(rankSingle.eventId), asc(person.name));
}

export async function getAverageNationalRecords(stateId: string) {
  cacheLife("days");
  cacheTag(`average-national-records-${stateId}`);

  return await db
    .select({
      eventId: rankAverage.eventId,
      personId: person.wcaId,
      personName: person.name,
      value: rankAverage.best,
    })
    .from(rankAverage)
    .innerJoin(person, eq(rankAverage.personId, person.wcaId))
    .where(
      and(
        eq(person.stateId, stateId),
        eq(rankAverage.countryRank, 1),
        notInArray(rankAverage.eventId, EXCLUDED_EVENTS),
      ),
    )
    .orderBy(asc(rankAverage.eventId), asc(person.name));
}

export async function getTopMembersByPodiums(
  stateId: string,
  limit = OVERVIEW_TOP_MEMBERS_LIMIT,
): Promise<TeamTopMember[]> {
  cacheLife("days");
  cacheTag(`team-top-members-${stateId}`);

  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      podiums: count().as("podiums"),
    })
    .from(person)
    .innerJoin(result, eq(person.wcaId, result.personId))
    .where(
      and(
        eq(person.stateId, stateId),
        or(eq(result.roundTypeId, "f"), eq(result.roundTypeId, "c")),
        inArray(result.pos, [1, 2, 3]),
        gt(result.best, 0),
      ),
    )
    .groupBy(person.wcaId, person.name)
    .orderBy(desc(count()), asc(person.name))
    .limit(limit);
}

export async function getMembers(
  input: GetMembersSchema,
  stateId: Person["stateId"],
) {
  cacheLife("days");
  cacheTag(`members-list-${stateId}`);

  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(person.stateId, stateId!),
    input.name ? accentInsensitiveContains(person.name, input.name) : undefined,
    input.gender.length > 0 ? inArray(person.gender, input.gender) : undefined,
    input.specialties.length > 0
      ? sql`${teamMember.specialties} ?| array[${sql.join(
          input.specialties.map((specialty) => sql`${specialty}`),
          sql`, `,
        )}]::text[]`
      : undefined,
  );

  const orderBy =
    input.sort.length > 0
      ? input.sort.map((item) => {
          switch (item.id) {
            case "role":
              return item.desc ? desc(teamMember.role) : asc(teamMember.role);
            case "stateRecords":
              return item.desc
                ? desc(sql`"state_records"`)
                : asc(sql`"state_records"`);
            case "historicalStateRecords":
              return item.desc
                ? desc(sql`"historical_state_records"`)
                : asc(sql`"historical_state_records"`);
            case "podiums":
              return item.desc ? desc(sql`"podiums"`) : asc(sql`"podiums"`);
            case "specialties":
              return asc(person.name);
            case "name":
            case "wcaId":
            case "gender":
              return item.desc ? desc(person[item.id]) : asc(person[item.id]);
            default:
              return asc(person.name);
          }
        })
      : [asc(person.name)];

  const { data, total } = await db.transaction(async (tx) => {
    const data = await tx
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gender: person.gender,
        role: teamMember.role,
        podiums: count(
          sql`CASE 
                    WHEN ${result.roundTypeId} IN ('f', 'c') 
                    AND ${result.pos} IN (1, 2, 3) 
                    AND ${result.best} > 0 
                    THEN 1 
                  END`,
        ).as("podiums"),
        stateRecords: sql<number>`(
              SELECT CAST((
                (SELECT COUNT(*)
                  FROM ranks_single
                  WHERE person_id = ${person.wcaId}
                  AND state_rank = 1)
                +
                (SELECT COUNT(*)
                  FROM ranks_average
                  WHERE person_id = ${person.wcaId}
                  AND state_rank = 1)
              ) AS INTEGER) AS state_records
            )`.as("state_records"),
        historicalStateRecords: sql<number>`(
              SELECT CAST(COALESCE(SUM(
                (CASE WHEN state_single_record = 'SR' THEN 1 ELSE 0 END) +
                (CASE WHEN state_average_record = 'SR' THEN 1 ELSE 0 END)
              ), 0) AS INTEGER)
              FROM results
              WHERE person_id = ${person.wcaId}
            )`.as("historical_state_records"),
        specialties: teamMember.specialties,
      })
      .from(person)
      .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
      .innerJoin(result, eq(person.wcaId, result.personId))
      .limit(input.perPage)
      .offset(offset)
      .where(where)
      .groupBy(
        person.wcaId,
        person.name,
        person.gender,
        teamMember.role,
        teamMember.specialties,
      )
      .orderBy(...orderBy);

    const total = (await tx
      .select({
        count: count(),
      })
      .from(person)
      .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
      .where(where)
      .execute()
      .then((res) => res[0]?.count ?? 0)) as number;

    return {
      data,
      total,
    };
  });

  const pageCount = Math.ceil(total / input.perPage);
  return { data, pageCount };
}

export async function getMembersGenderCounts(stateId: Person["stateId"]) {
  cacheLife("days");
  cacheTag(`members-gender-count-${stateId}`);

  return await db
    .select({
      gender: person.gender,
      count: count(),
    })
    .from(person)
    .where(eq(person.stateId, stateId!))
    .groupBy(person.gender)
    .having(gt(count(), 0))
    .orderBy(person.gender)
    .then((res) =>
      res.reduce(
        (acc, { gender, count }) => {
          if (!gender) return acc;
          acc[gender] = count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    );
}
