"use cache";

import "server-only";
import { readFile } from "fs/promises";
import { join } from "path";
import { db } from "@workspace/db";
import {
  event,
  Person,
  state,
  team,
  person,
  competition,
  result,
  exportMetadata,
} from "@workspace/db/schema";
import { cacheLife, cacheTag } from "next/cache";
import {
  and,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  notInArray,
  or,
} from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { currentUserTeamTag } from "@/lib/cache-tag-names";
import { eventScopeFilter } from "@/lib/official-events";
import type { EventScope } from "@/lib/constants";

export async function getEvents(scope: EventScope = "official") {
  cacheLife("max");
  cacheTag("events");

  return await db
    .select({
      id: event.id,
      name: event.name,
    })
    .from(event)
    .where(eventScopeFilter(scope))
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

export async function getCurrentUserTeam({
  userId,
}: {
  userId: Person["wcaId"];
}): Promise<{ id: string; name: string } | undefined> {
  cacheLife("hours");
  cacheTag(currentUserTeamTag(userId));

  const [row] = await db
    .select({
      id: team.stateId,
      name: team.name,
    })
    .from(person)
    .innerJoin(team, eq(person.stateId, team.stateId))
    .where(eq(person.wcaId, userId))
    .limit(1);

  if (row) {
    cacheTag(`team-info-${row.id}`);
  }
  return row;
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

/** Dates of the last imported WCA and Cubing Contests exports, for attribution. */
export async function getDataSourceDates(): Promise<{
  wca: Date | null;
  cubingContests: Date | null;
}> {
  cacheLife("hours");
  cacheTag("data-source-dates");

  const rows = await db
    .select({ key: exportMetadata.key, value: exportMetadata.value })
    .from(exportMetadata)
    .where(
      inArray(exportMetadata.key, [
        "wca_export_date",
        "cubing_contests_export_date",
      ]),
    );

  const toDate = (key: string) => {
    // The Cubing Contests job appends ":partial" when it skipped results.
    const value = rows
      .find((row) => row.key === key)
      ?.value?.split(":partial")[0];
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };

  return {
    wca: toDate("wca_export_date"),
    cubingContests: toDate("cubing_contests_export_date"),
  };
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
