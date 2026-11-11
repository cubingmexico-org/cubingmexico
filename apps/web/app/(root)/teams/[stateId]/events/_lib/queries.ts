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
  resultAttempts,
} from "@workspace/db/schema";
import { and, eq, gt, gte, inArray, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { OFFICIAL_EVENT_MAX_RANK, type EventScope } from "@/lib/constants";
import {
  eventScopeFilter,
  inOfficialEvents,
  inScopeEvents,
  isOfficialEvent,
} from "@/lib/official-events";
import {
  cutoffAttempts,
  median,
  recommendCutoff,
  typicalCutoff,
  type CutoffRecommendation,
  type CutoffRound,
} from "./cutoff";
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

export type TeamEventCutoff = CutoffRecommendation & {
  eventId: string;
  eventName: string;
  eventRank: number;
  /** Attempts to make the cutoff, from the format the event uses most often. */
  attempts: number;
};

const CUTOFF_ROUND_TYPES = ["c", "d", "e", "g"];

const cutoffAttemptsSql = sql`CASE ${result.formatId} WHEN 'a' THEN 2 ELSE 1 END`;
const firstAttemptsBestSql = sql<
  number | null
>`MIN(${resultAttempts.value}) FILTER (WHERE ${resultAttempts.value} > 0 AND ${resultAttempts.attemptNumber} <= ${cutoffAttemptsSql})::int`;
const cutoffEventsFilter = and(
  isOfficialEvent,
  eq(event.format, "time"),
  inArray(result.formatId, ["a", "m"]),
);

/**
 * Only official timed events in Ao5 or Mo3 rounds, the formats that take
 * cutoffs. `typicalSince` bounds the rounds with a cutoff held in Mexico that
 * set the typical cutoff each suggestion is capped at.
 */
export async function getTeamEventCutoffs(
  stateId: string,
  since: string | null,
  typicalSince: string | null,
): Promise<TeamEventCutoff[]> {
  cacheLife("weeks");
  cacheTag(`team-events-${stateId}`);

  const [rows, typicalCutoffs] = await Promise.all([
    db
      .select({
        personId: result.personId,
        eventId: event.id,
        eventName: event.name,
        eventRank: event.rank,
        formatId: result.formatId,
        firstAttemptsBest: firstAttemptsBestSql,
      })
      .from(result)
      .innerJoin(resultAttempts, eq(resultAttempts.resultId, result.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          eq(person.stateId, stateId),
          eq(competition.countryId, "Mexico"),
          sinceFilter(since),
          cutoffEventsFilter,
        ),
      )
      .groupBy(
        result.id,
        result.personId,
        event.id,
        event.name,
        event.rank,
        result.formatId,
      ),
    getTypicalCutoffs(typicalSince),
  ]);

  const byEvent = new Map<
    string,
    {
      eventName: string;
      eventRank: number;
      formats: Map<string, number>;
      members: Map<string, number[]>;
    }
  >();
  for (const row of rows) {
    let entry = byEvent.get(row.eventId);
    if (!entry) {
      entry = {
        eventName: row.eventName,
        eventRank: row.eventRank,
        formats: new Map(),
        members: new Map(),
      };
      byEvent.set(row.eventId, entry);
    }
    entry.formats.set(row.formatId, (entry.formats.get(row.formatId) ?? 0) + 1);
    const rounds = entry.members.get(row.personId) ?? [];
    rounds.push(row.firstAttemptsBest ?? Number.POSITIVE_INFINITY);
    entry.members.set(row.personId, rounds);
  }

  const cutoffs: TeamEventCutoff[] = [];
  for (const [eventId, entry] of byEvent) {
    const recommendation = recommendCutoff(
      [...entry.members.values()].map(median),
      typicalCutoffs.get(eventId) ?? null,
    );
    if (!recommendation) continue;
    const [formatId] = [...entry.formats].reduce((a, b) =>
      b[1] > a[1] ? b : a,
    );
    cutoffs.push({
      ...recommendation,
      eventId,
      eventName: entry.eventName,
      eventRank: entry.eventRank,
      attempts: cutoffAttempts(formatId),
    });
  }

  return cutoffs.sort(
    (a, b) => a.eventRank - b.eventRank || a.eventId.localeCompare(b.eventId),
  );
}

/** Typical cutoff per event across rounds with a cutoff held in Mexico. */
async function getTypicalCutoffs(
  since: string | null,
): Promise<Map<string, number>> {
  const perResult = db.$with("per_result").as(
    db
      .select({
        competitionId: result.competitionId,
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        firstAttemptsBest: firstAttemptsBestSql.as("first_attempts_best"),
        madeCutoff:
          sql<boolean>`BOOL_OR(${resultAttempts.attemptNumber} > ${cutoffAttemptsSql} AND ${resultAttempts.value} <> 0)`.as(
            "made_cutoff",
          ),
      })
      .from(result)
      .innerJoin(resultAttempts, eq(resultAttempts.resultId, result.id))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          eq(competition.countryId, "Mexico"),
          sinceFilter(since),
          inArray(result.roundTypeId, CUTOFF_ROUND_TYPES),
          cutoffEventsFilter,
        ),
      )
      .groupBy(result.id),
  );

  const rounds = await db
    .with(perResult)
    .select({
      eventId: perResult.eventId,
      slowestMade: sql<
        number | null
      >`MAX(${perResult.firstAttemptsBest}) FILTER (WHERE ${perResult.madeCutoff})::int`,
      fastestMissed: sql<
        number | null
      >`MIN(${perResult.firstAttemptsBest}) FILTER (WHERE NOT ${perResult.madeCutoff})::int`,
    })
    .from(perResult)
    .groupBy(perResult.competitionId, perResult.eventId, perResult.roundTypeId);

  const byEvent = new Map<string, CutoffRound[]>();
  for (const { eventId, ...round } of rounds) {
    const eventRounds = byEvent.get(eventId) ?? [];
    eventRounds.push(round);
    byEvent.set(eventId, eventRounds);
  }

  const typical = new Map<string, number>();
  for (const [eventId, eventRounds] of byEvent) {
    const cutoff = typicalCutoff(eventRounds);
    if (cutoff !== null) typical.set(eventId, cutoff);
  }
  return typical;
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
