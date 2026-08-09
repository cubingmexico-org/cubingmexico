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
  ilike,
  gt,
  eq,
  inArray,
  asc,
  desc,
  sql,
  or,
} from "drizzle-orm";
import { type GetMembersSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getTeamInfo(stateId: string) {
  cacheLife("days");
  cacheTag(`team-info-${stateId}`);

  try {
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
  } catch (err) {
    console.error(err);
    return null;
  }
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

export async function getTeamOverviewData(stateId: string) {
  const [
    team,
    competitions,
    totalPodiums,
    totalSingleNationalRecords,
    totalAverageNationalRecords,
  ] = await Promise.all([
    getTeamInfo(stateId),
    getTeamCompetitions(stateId),
    getTeamPodiums(stateId),
    getSingleNationalRecords(stateId),
    getAverageNationalRecords(stateId),
  ]);

  if (!team) {
    return null;
  }

  const upcomingCompetitions = competitions.filter(
    (competition) => competition.startDate >= new Date(),
  );

  const totalNationalRecords =
    totalSingleNationalRecords.length + totalAverageNationalRecords.length;

  return {
    team,
    competitions,
    upcomingCompetitions,
    totalPodiums,
    totalNationalRecords,
  };
}

export async function getTeamStatisticsData(stateId: string) {
  const [
    team,
    competitions,
    totalPodiums,
    totalSingleNationalRecords,
    totalAverageNationalRecords,
  ] = await Promise.all([
    getTeamInfo(stateId),
    getTeamCompetitions(stateId),
    getTeamPodiums(stateId),
    getSingleNationalRecords(stateId),
    getAverageNationalRecords(stateId),
  ]);

  if (!team) {
    return null;
  }

  const totalNationalRecords =
    totalSingleNationalRecords.length + totalAverageNationalRecords.length;

  const foundedYear = team.founded
    ? new Date(team.founded).getFullYear()
    : new Date().getFullYear();

  return {
    team,
    competitions,
    totalPodiums,
    totalNationalRecords,
    activeYears: new Date().getFullYear() - foundedYear,
  };
}

export async function getTotalMembers(stateId: string) {
  cacheLife("days");
  cacheTag(`total-members-${stateId}`);

  try {
    const data = await db
      .select({ count: count() })
      .from(person)
      .where(eq(person.stateId, stateId));

    return data[0]?.count ?? 0;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

export async function getTeamCompetitions(stateId: string) {
  cacheLife("days");
  cacheTag(`team-competitions-${stateId}`);

  try {
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
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getTeamPodiums(stateId: string) {
  cacheLife("days");
  cacheTag(`team-podiums-${stateId}`);

  try {
    return await db
      .select({ pos: result.pos })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          eq(person.stateId, stateId),
          or(eq(result.roundTypeId, "f"), eq(result.roundTypeId, "c")),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      );
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getSingleNationalRecords(stateId: string) {
  cacheLife("days");
  cacheTag(`single-national-records-${stateId}`);

  try {
    return await db
      .select({ eventId: rankSingle.eventId })
      .from(rankSingle)
      .innerJoin(person, eq(rankSingle.personId, person.wcaId))
      .where(and(eq(person.stateId, stateId), eq(rankSingle.countryRank, 1)));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getAverageNationalRecords(stateId: string) {
  cacheLife("days");
  cacheTag(`average-national-records-${stateId}`);

  try {
    return await db
      .select({ eventId: rankAverage.eventId })
      .from(rankAverage)
      .innerJoin(person, eq(rankAverage.personId, person.wcaId))
      .where(and(eq(person.stateId, stateId), eq(rankAverage.countryRank, 1)));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function getMembers(
  input: GetMembersSchema,
  stateId: Person["stateId"],
) {
  cacheLife("days");
  cacheTag(`members-list-${stateId}`);

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
      eq(person.stateId, stateId!),
      input.name ? ilike(person.name, `%${input.name}%`) : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
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
          stateRecords: sql`(
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
  } catch (err) {
    console.error(err);
    return { data: [], pageCount: 0 };
  }
}

export async function getMembersGenderCounts(stateId: Person["stateId"]) {
  cacheLife("days");
  cacheTag(`members-gender-count-${stateId}`);

  try {
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
  } catch (err) {
    console.error(err);
    return {} as Record<string, number>;
  }
}
