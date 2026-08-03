"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  person,
  rankAverage,
  rankSingle,
  result,
  state,
  team,
} from "@workspace/db/schema";
import { and, eq, gt, inArray, or } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

export async function getStatisticsPageData(stateId: string) {
  const [
    teamInfo,
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

  if (!teamInfo) {
    return null;
  }

  const totalNationalRecords =
    totalSingleNationalRecords.length + totalAverageNationalRecords.length;

  const foundedYear = teamInfo.founded
    ? new Date(teamInfo.founded).getFullYear()
    : new Date().getFullYear();

  return {
    team: teamInfo,
    competitions,
    totalPodiums,
    totalNationalRecords,
    activeYears: new Date().getFullYear() - foundedYear,
  };
}

async function getTeamInfo(stateId: string) {
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

async function getTeamCompetitions(stateId: string) {
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

async function getTeamPodiums(stateId: string) {
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

async function getSingleNationalRecords(stateId: string) {
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

async function getAverageNationalRecords(stateId: string) {
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
