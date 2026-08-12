import "server-only";

import { db } from "@workspace/db";
import { competition, person, state, team } from "@workspace/db/schema";
import { and, eq, or } from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import type { SiteSearchResults } from "@/lib/site-search-types";

export type {
  SiteSearchCompetition,
  SiteSearchPerson,
  SiteSearchResults,
  SiteSearchTeam,
} from "@/lib/site-search-types";

const LIMIT = 8;

async function searchPersons(q: string): Promise<SiteSearchResults["persons"]> {
  return await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
    })
    .from(person)
    .where(
      or(
        accentInsensitiveContains(person.name, q),
        accentInsensitiveContains(person.wcaId, q),
      ),
    )
    .orderBy(person.name)
    .limit(LIMIT);
}

async function searchCompetitions(
  q: string,
): Promise<SiteSearchResults["competitions"]> {
  return await db
    .select({
      id: competition.id,
      name: competition.name,
      cityName: competition.cityName,
    })
    .from(competition)
    .where(
      and(
        eq(competition.countryId, "Mexico"),
        or(
          accentInsensitiveContains(competition.name, q),
          accentInsensitiveContains(competition.cityName, q),
        ),
      ),
    )
    .orderBy(competition.name)
    .limit(LIMIT);
}

async function searchTeams(q: string): Promise<SiteSearchResults["teams"]> {
  return await db
    .select({
      stateId: team.stateId,
      name: team.name,
      stateName: state.name,
    })
    .from(team)
    .innerJoin(state, eq(team.stateId, state.id))
    .where(
      or(
        accentInsensitiveContains(team.name, q),
        accentInsensitiveContains(state.name, q),
        accentInsensitiveContains(team.stateId, q),
      ),
    )
    .orderBy(team.name)
    .limit(LIMIT);
}

export async function searchSite(q: string): Promise<SiteSearchResults> {
  const [persons, competitions, teams] = await Promise.all([
    searchPersons(q),
    searchCompetitions(q),
    searchTeams(q),
  ]);

  return { persons, competitions, teams };
}
