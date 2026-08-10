import "server-only";

import { db } from "@workspace/db";
import { competition, person, state, team } from "@workspace/db/schema";
import { and, eq, ilike, or } from "drizzle-orm";
import type { SiteSearchResults } from "@/lib/site-search-types";

export type {
  SiteSearchCompetition,
  SiteSearchPerson,
  SiteSearchResults,
  SiteSearchTeam,
} from "@/lib/site-search-types";

const LIMIT = 8;

async function searchPersons(q: string): Promise<SiteSearchResults["persons"]> {
  const pattern = `%${q}%`;

  try {
    return await db
      .select({
        wcaId: person.wcaId,
        name: person.name,
      })
      .from(person)
      .where(or(ilike(person.name, pattern), ilike(person.wcaId, pattern)))
      .orderBy(person.name)
      .limit(LIMIT);
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function searchCompetitions(
  q: string,
): Promise<SiteSearchResults["competitions"]> {
  const pattern = `%${q}%`;

  try {
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
            ilike(competition.name, pattern),
            ilike(competition.cityName, pattern),
          ),
        ),
      )
      .orderBy(competition.name)
      .limit(LIMIT);
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function searchTeams(q: string): Promise<SiteSearchResults["teams"]> {
  const pattern = `%${q}%`;

  try {
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
          ilike(team.name, pattern),
          ilike(state.name, pattern),
          ilike(team.stateId, pattern),
        ),
      )
      .orderBy(team.name)
      .limit(LIMIT);
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function searchSite(q: string): Promise<SiteSearchResults> {
  const [persons, competitions, teams] = await Promise.all([
    searchPersons(q),
    searchCompetitions(q),
    searchTeams(q),
  ]);

  return { persons, competitions, teams };
}
