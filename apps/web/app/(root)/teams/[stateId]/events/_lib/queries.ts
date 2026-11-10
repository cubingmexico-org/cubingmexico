"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  event,
  person,
  rankAverage,
  rankSingle,
  result,
} from "@workspace/db/schema";
import { and, eq, gt, gte, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { OFFICIAL_EVENT_MAX_RANK, type EventScope } from "@/lib/constants";
import {
  eventScopeFilter,
  inOfficialEvents,
  inScopeEvents,
} from "@/lib/official-events";
import { recommendEvent, type EventRecommendation } from "./recommendation";

const NATIONAL_TOP_N = 100;

export type TeamEventInsight = {
  eventId: string;
  eventName: string;
  eventRank: number;
  isOfficial: boolean;
  /** Team members with a result in the event in Mexico, within the window. */
  members: number;
  /** `members` over team members active in any official event; null for deprecated events. */
  demandShare: number | null;
  roundsCompeted: number;
  roundsCompetedOutside: number;
  podiums: number;
  /** Rounds held in competitions hosted by the state, within the window. */
  roundsHosted: number;
  competitionsHosted: number;
  /** `competitionsHosted` over competitions hosted in the state; null for deprecated events. */
  supplyShare: number | null;
  coverage: number | null;
  gap: number | null;
  recommendation: EventRecommendation | null;
  /** All-time, from the current national ranks. */
  top100Single: number;
  top100Average: number;
  bestNationalRank: number | null;
};

export type TeamEventInsights = {
  activeMembers: number;
  hostedRounds: number;
  hostedCompetitions: number;
  events: TeamEventInsight[];
};

/** Distinct rounds as `(competition, round type)` pairs; callers group by event. */
const roundKey = sql`${result.competitionId} || ':' || COALESCE(${result.roundTypeId}, '')`;
const roundKeyWithEvent = sql`${result.competitionId} || ':' || ${result.eventId} || ':' || COALESCE(${result.roundTypeId}, '')`;

function sinceFilter(since: string | null): SQL | undefined {
  return since ? gte(competition.startDate, new Date(since)) : undefined;
}

export async function getTeamEventInsights(
  stateId: string,
  since: string | null,
  scope: EventScope = "official",
): Promise<TeamEventInsights> {
  cacheLife("weeks");
  cacheTag(`team-events-${stateId}`);

  const memberResultsInMexico = and(
    eq(person.stateId, stateId),
    eq(competition.countryId, "Mexico"),
    sinceFilter(since),
  );
  const hostedResults = and(
    eq(competition.stateId, stateId),
    sinceFilter(since),
  );

  const [
    demandRows,
    supplyRows,
    singleRankRows,
    averageRankRows,
    memberTotals,
    hostedTotals,
  ] = await Promise.all([
    db
      .select({
        eventId: event.id,
        eventName: event.name,
        eventRank: event.rank,
        members: sql<number>`COUNT(DISTINCT ${result.personId})::int`,
        roundsCompeted: sql<number>`COUNT(DISTINCT ${roundKey})::int`,
        roundsCompetedOutside: sql<number>`COUNT(DISTINCT ${roundKey}) FILTER (WHERE ${competition.stateId} IS DISTINCT FROM ${stateId})::int`,
        podiums: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} IN (1, 2, 3) AND ${result.roundTypeId} IN ('f', 'c') AND ${result.best} > 0)::int`,
      })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(and(memberResultsInMexico, eventScopeFilter(scope)))
      .groupBy(event.id, event.name, event.rank),

    db
      .select({
        eventId: event.id,
        eventName: event.name,
        eventRank: event.rank,
        rounds: sql<number>`COUNT(DISTINCT ${roundKey})::int`,
        competitions: sql<number>`COUNT(DISTINCT ${result.competitionId})::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(and(hostedResults, eventScopeFilter(scope)))
      .groupBy(event.id, event.name, event.rank),

    rankStrength(rankSingle, stateId, scope),
    rankStrength(rankAverage, stateId, scope),

    db
      .select({
        activeMembers: sql<number>`COUNT(DISTINCT ${result.personId})::int`,
      })
      .from(result)
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(and(memberResultsInMexico, inOfficialEvents(result.eventId)))
      .then((rows) => rows[0]),

    db
      .select({
        rounds: sql<number>`COUNT(DISTINCT ${roundKeyWithEvent})::int`,
        competitions: sql<number>`COUNT(DISTINCT ${result.competitionId})::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(and(hostedResults, inOfficialEvents(result.eventId)))
      .then((rows) => rows[0]),
  ]);

  const activeMembers = memberTotals?.activeMembers ?? 0;
  const hostedRounds = hostedTotals?.rounds ?? 0;
  const hostedCompetitions = hostedTotals?.competitions ?? 0;

  const byEvent = new Map<string, TeamEventInsight>();
  const ensure = (row: {
    eventId: string;
    eventName: string;
    eventRank: number;
  }) => {
    let insight = byEvent.get(row.eventId);
    if (!insight) {
      insight = {
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: row.eventRank,
        isOfficial: row.eventRank < OFFICIAL_EVENT_MAX_RANK,
        members: 0,
        demandShare: null,
        roundsCompeted: 0,
        roundsCompetedOutside: 0,
        podiums: 0,
        roundsHosted: 0,
        competitionsHosted: 0,
        supplyShare: null,
        coverage: null,
        gap: null,
        recommendation: null,
        top100Single: 0,
        top100Average: 0,
        bestNationalRank: null,
      };
      byEvent.set(row.eventId, insight);
    }
    return insight;
  };

  for (const row of demandRows) {
    const insight = ensure(row);
    insight.members = row.members;
    insight.roundsCompeted = row.roundsCompeted;
    insight.roundsCompetedOutside = row.roundsCompetedOutside;
    insight.podiums = row.podiums;
  }
  for (const row of supplyRows) {
    const insight = ensure(row);
    insight.roundsHosted = row.rounds;
    insight.competitionsHosted = row.competitions;
  }
  for (const row of singleRankRows) {
    const insight = ensure(row);
    insight.top100Single = row.top100;
    insight.bestNationalRank = row.bestRank;
  }
  for (const row of averageRankRows) {
    const insight = ensure(row);
    insight.top100Average = row.top100;
    if (
      row.bestRank !== null &&
      (insight.bestNationalRank === null ||
        row.bestRank < insight.bestNationalRank)
    ) {
      insight.bestNationalRank = row.bestRank;
    }
  }

  for (const insight of byEvent.values()) {
    if (!insight.isOfficial) continue;
    const demandShare = activeMembers > 0 ? insight.members / activeMembers : 0;
    const supplyShare =
      hostedCompetitions > 0
        ? insight.competitionsHosted / hostedCompetitions
        : 0;
    insight.demandShare = demandShare;
    insight.supplyShare = supplyShare;
    const { gap, coverage, recommendation } = recommendEvent({
      members: insight.members,
      demandShare,
      supplyShare,
    });
    insight.gap = gap;
    insight.coverage = coverage;
    insight.recommendation = recommendation;
  }

  return {
    activeMembers,
    hostedRounds,
    hostedCompetitions,
    events: [...byEvent.values()].sort(
      (a, b) => a.eventRank - b.eventRank || a.eventId.localeCompare(b.eventId),
    ),
  };
}

function rankStrength(
  table: typeof rankSingle | typeof rankAverage,
  stateId: string,
  scope: EventScope,
) {
  return db
    .select({
      eventId: event.id,
      eventName: event.name,
      eventRank: event.rank,
      top100: sql<number>`COUNT(*) FILTER (WHERE ${table.countryRank} <= ${NATIONAL_TOP_N})::int`,
      bestRank: sql<number | null>`MIN(${table.countryRank})::int`,
    })
    .from(table)
    .innerJoin(person, eq(table.personId, person.wcaId))
    .innerJoin(event, eq(table.eventId, event.id))
    .where(
      and(
        eq(person.stateId, stateId),
        gt(table.countryRank, 0),
        inScopeEvents(table.eventId, scope),
      ),
    )
    .groupBy(event.id, event.name, event.rank);
}
