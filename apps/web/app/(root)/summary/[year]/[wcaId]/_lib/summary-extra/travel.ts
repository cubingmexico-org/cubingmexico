import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  group,
  groupMembership,
  person,
  result,
  state,
} from "@workspace/db/schema";
import { and, asc, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import type {
  CommunityCompanions,
  SharedCuber,
  StateVisits,
  YearStates,
} from "./types";
import { haversineKm } from "./utils";

export async function computeTravelKm(
  wcaId: string,
  yearStart: Date,
  yearEnd: Date,
): Promise<number | null> {
  const comps = await db
    .select({
      id: competition.id,
      startDate: competition.startDate,
      lat: competition.latitudeMicrodegrees,
      lng: competition.longitudeMicrodegrees,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        gte(competition.startDate, yearStart),
        lt(competition.startDate, yearEnd),
      ),
    )
    .groupBy(
      competition.id,
      competition.startDate,
      competition.latitudeMicrodegrees,
      competition.longitudeMicrodegrees,
    )
    .orderBy(asc(competition.startDate));

  const points = comps
    .map((c) => ({
      lat: (c.lat ?? 0) / 1_000_000,
      lng: (c.lng ?? 0) / 1_000_000,
    }))
    .filter((p) => p.lat !== 0 || p.lng !== 0);

  if (points.length < 2) return null;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(
      points[i - 1]!.lat,
      points[i - 1]!.lng,
      points[i]!.lat,
      points[i]!.lng,
    );
  }

  return Math.round(total);
}

export async function enhanceStatesWithFirstTime(
  wcaId: string,
  yearStart: Date,
  yearVisits: StateVisits[],
): Promise<YearStates> {
  if (yearVisits.length === 0) {
    return { visits: [], firstTime: [] };
  }

  const priorRows = await db
    .select({
      stateId: competition.stateId,
      cityName: competition.cityName,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(
      and(
        eq(result.personId, wcaId),
        lt(competition.startDate, yearStart),
        eq(competition.countryId, "Mexico"),
      ),
    )
    .groupBy(competition.stateId, competition.cityName);

  const priorIds = new Set<string>();
  const allStates = await db
    .select({ id: state.id, name: state.name })
    .from(state)
    .orderBy(desc(sql`LENGTH(${state.name})`));

  for (const row of priorRows) {
    if (row.stateId) {
      priorIds.add(row.stateId);
      continue;
    }
    const city = row.cityName ?? "";
    const matched = allStates.find((s) =>
      city.toLowerCase().includes(s.name.toLowerCase()),
    );
    if (matched) priorIds.add(matched.id);
  }

  const firstTime = yearVisits.filter((v) => !priorIds.has(v.stateId));

  return { visits: yearVisits, firstTime };
}

export async function computeTeammates(
  wcaId: string,
  stateId: string | null,
  sharedCubers: SharedCuber[],
): Promise<SharedCuber[]> {
  if (!stateId || sharedCubers.length === 0) return [];

  const teammateIds = await db
    .select({ wcaId: person.wcaId })
    .from(person)
    .where(and(eq(person.stateId, stateId), ne(person.wcaId, wcaId)));

  const teammateSet = new Set(teammateIds.map((t) => t.wcaId));
  return sharedCubers.filter((c) => teammateSet.has(c.wcaId)).slice(0, 10);
}

/** Top shared cubers per active community the person belongs to. */
export async function computeCommunityCompanions(
  wcaId: string,
  sharedCubers: SharedCuber[],
): Promise<CommunityCompanions[]> {
  if (sharedCubers.length === 0) return [];

  const communities = await db
    .select({
      groupId: group.id,
      groupName: group.name,
    })
    .from(groupMembership)
    .innerJoin(group, eq(groupMembership.groupId, group.id))
    .where(
      and(
        eq(groupMembership.personId, wcaId),
        eq(group.kind, "community"),
        eq(group.isActive, true),
      ),
    )
    .orderBy(asc(group.name));

  if (communities.length === 0) return [];

  const groupIds = communities.map((c) => c.groupId);
  const memberRows = await db
    .select({
      groupId: groupMembership.groupId,
      personId: groupMembership.personId,
    })
    .from(groupMembership)
    .where(
      and(
        inArray(groupMembership.groupId, groupIds),
        eq(groupMembership.hideFromRoster, false),
        ne(groupMembership.personId, wcaId),
      ),
    );

  const membersByGroup = new Map<string, Set<string>>();
  for (const row of memberRows) {
    const set = membersByGroup.get(row.groupId) ?? new Set<string>();
    set.add(row.personId);
    membersByGroup.set(row.groupId, set);
  }

  const result: CommunityCompanions[] = [];
  for (const community of communities) {
    const memberSet = membersByGroup.get(community.groupId);
    if (!memberSet || memberSet.size === 0) continue;
    const companions = sharedCubers
      .filter((c) => memberSet.has(c.wcaId))
      .slice(0, 10);
    if (companions.length === 0) continue;
    result.push({
      groupId: community.groupId,
      groupName: community.groupName,
      companions,
    });
  }

  return result;
}
