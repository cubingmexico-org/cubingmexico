"use cache";

import "server-only";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "@workspace/db";
import {
  event,
  Person,
  State,
  state,
  Team,
  team,
  teamMember,
  person,
  TeamMember,
  competition,
  result,
} from "@workspace/db/schema";
import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, isNull, lt, notInArray, or } from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { EXCLUDED_EVENTS } from "@/lib/constants";

export async function getEvents() {
  cacheLife("max");
  cacheTag("events");

  return await db
    .select({
      id: event.id,
      name: event.name,
    })
    .from(event)
    .where(notInArray(event.id, EXCLUDED_EVENTS))
    .orderBy(event.rank)
    .then((res) => res);
}

export async function getStates() {
  cacheLife("max");
  cacheTag("states");

  return await db
    .select({
      id: state.id,
      name: state.name,
    })
    .from(state)
    .then((res) => res);
}

export async function getPersons() {
  cacheLife("days");
  cacheTag("persons");

  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
    })
    .from(person)
    .then((res) => res);
}

export async function getCompetitions() {
  cacheLife("days");
  cacheTag("competitions-sitemap");

  return await db
    .select({
      id: competition.id,
      name: competition.name,
    })
    .from(competition)
    .where(eq(competition.countryId, "Mexico"))
    .then((res) => res);
}

export async function getCurrentUserTeam({
  userId,
}: {
  userId: Person["wcaId"];
}) {
  cacheLife("hours");
  cacheTag(`current-user-team-${userId}`);

  return (await db
    .select({
      id: person.stateId,
      name: team.name,
    })
    .from(person)
    .innerJoin(team, eq(person.stateId, team.stateId))
    .where(eq(person.wcaId, userId))
    .then((res) => res[0])) as {
    id: string;
    name: string;
  };
}

export async function getPerson(id: string) {
  cacheLife("hours");
  cacheTag(`person-${id}`);

  const res = await db
    .select({
      name: person.name,
    })
    .from(person)
    .where(eq(person.wcaId, id));
  return res[0];
}

export async function getTeam(stateId: string) {
  cacheLife("hours");
  cacheTag(`team-${stateId}`);

  const res = await db
    .select({
      name: team.name,
      state: state.name,
    })
    .from(team)
    .innerJoin(state, eq(team.stateId, state.id))
    .where(eq(team.stateId, stateId));
  return res[0];
}

export async function saveTeam({
  stateId,
  name,
  description,
  socialLinks,
  founded,
  isActive,
}: {
  stateId: State["id"];
  name: Team["name"];
  description: Team["description"];
  socialLinks: Team["socialLinks"];
  founded: Team["founded"];
  isActive: Team["isActive"];
}) {
  try {
    await db
      .update(team)
      .set({
        name,
        description,
        socialLinks,
        founded,
        isActive,
      })
      .where(eq(team.stateId, stateId));
  } catch (error) {
    console.error("Failed to save team in database");
    throw error;
  }
}

export async function saveProfile({
  stateId,
  personId,
}: {
  stateId: State["id"];
  personId: Person["wcaId"];
}) {
  try {
    await db
      .update(person)
      .set({
        stateId,
      })
      .where(eq(person.wcaId, personId));
  } catch (error) {
    console.error("Failed to save profile in database");
    throw error;
  }
}

export async function deleteTeamLogo({ stateId }: { stateId: State["id"] }) {
  try {
    await db
      .update(team)
      .set({
        image: null,
      })
      .where(eq(team.stateId, stateId));
  } catch (error) {
    console.error("Failed to delete team logo in database");
    throw error;
  }
}

export async function updateTeamLogo({
  stateId,
  image,
}: {
  stateId: State["id"];
  image: Team["image"];
}) {
  try {
    await db
      .update(team)
      .set({
        image,
      })
      .where(eq(team.stateId, stateId));
  } catch (error) {
    console.error("Failed to update team logo in database");
    throw error;
  }
}

export async function deleteTeamCover({ stateId }: { stateId: State["id"] }) {
  try {
    await db
      .update(team)
      .set({
        coverImage: null,
      })
      .where(eq(team.stateId, stateId));
  } catch (error) {
    console.error("Failed to delete team cover in database");
    throw error;
  }
}

export async function updateTeamCover({
  stateId,
  coverImage,
}: {
  stateId: State["id"];
  coverImage: Team["coverImage"];
}) {
  try {
    await db
      .update(team)
      .set({
        coverImage,
      })
      .where(eq(team.stateId, stateId));
  } catch (error) {
    console.error("Failed to update team cover in database");
    throw error;
  }
}

export async function addMember({
  personId,
  stateId,
  specialties,
  achievements,
}: {
  stateId: State["id"];
  personId: Person["wcaId"];
  specialties: TeamMember["specialties"];
  achievements: TeamMember["achievements"];
}) {
  try {
    await db
      .update(person)
      .set({
        stateId,
      })
      .where(eq(person.wcaId, personId));

    await db
      .insert(teamMember)
      .values({
        personId,
        specialties,
        achievements,
      })
      .onConflictDoUpdate({
        target: [teamMember.personId],
        set: {
          specialties,
          achievements,
        },
      });
  } catch (error) {
    console.error("Failed to add member in database");
    throw error;
  }
}

export async function getLastCompetitionWithResults() {
  cacheLife("hours");
  cacheTag("last-competition-with-results");

  const lastCompetitionWithResults = await db
    .select({
      name: competition.name,
    })
    .from(competition)
    .innerJoin(result, eq(competition.id, result.competitionId))
    .where(eq(competition.countryId, "Mexico"))
    .orderBy(desc(competition.endDate))
    .limit(1);

  const competitionsWithNoResults = await db
    .select({
      name: competition.name,
    })
    .from(competition)
    .leftJoin(result, eq(competition.id, result.competitionId))
    .where(
      and(
        eq(competition.countryId, "Mexico"),
        lt(competition.endDate, new Date()),
        isNull(result.competitionId),
        notInArray(competition.id, [
          "PerryOpen2013",
          "ChapingoOpen2020",
          "FMCTijuasII2026",
        ]),
      ),
    );
  return { lastCompetitionWithResults, competitionsWithNoResults };
}

export async function getPersonsWithoutState({ search }: { search: string }) {
  cacheLife("hours");
  cacheTag("persons-without-state");

  return await db
    .select({
      id: person.wcaId,
      name: person.name,
    })
    .from(person)
    .where(
      and(
        isNull(person.stateId),
        or(
          accentInsensitiveContains(person.name, search),
          accentInsensitiveContains(person.wcaId, search),
        ),
      ),
    )
    .orderBy(person.name)
    .limit(5)
    .then((res) => res);
}

interface StatesGeoJSON {
  type: string;
  features: {
    type: string;
    properties: {
      id: string;
      name: string;
    };
    geometry: {
      type: string;
      coordinates: number[][][][];
    };
  }[];
}

export async function getStatesGeoJSON(): Promise<StatesGeoJSON | null> {
  cacheLife("max");
  cacheTag("geojson");

  const filePath = join(process.cwd(), "public", "states.geojson");
  const fileContent = await readFile(filePath, "utf-8");
  return JSON.parse(fileContent) as StatesGeoJSON;
}
