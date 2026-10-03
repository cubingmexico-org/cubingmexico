import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  event,
  person,
  result,
  resultAttempts,
  state,
} from "@workspace/db/schema";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  inArray,
  isNotNull,
  ne,
  sql,
} from "drizzle-orm";
import { TOP_N, type TeamSummaryContext } from "./context";

export function queryHostedSection({
  stateId,
  hostedYearFilter,
}: TeamSummaryContext) {
  return Promise.all([
    // Hosted intro
    db
      .select({
        competitionCount: countDistinct(competition.id),
        firstCompetitionDate: sql<string>`MIN(${competition.startDate})`,
        lastCompetitionDate: sql<string>`MAX(${competition.endDate})`,
      })
      .from(competition)
      .where(hostedYearFilter)
      .then((rows) => rows[0]),

    // Biggest competition by unique competitors
    db
      .select({
        id: competition.id,
        name: competition.name,
        competitors: countDistinct(result.personId),
      })
      .from(competition)
      .innerJoin(result, eq(result.competitionId, competition.id))
      .where(hostedYearFilter)
      .groupBy(competition.id, competition.name)
      .orderBy(desc(countDistinct(result.personId)))
      .limit(1),

    // Total unique competitors in hosted comps
    db
      .select({
        total: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(hostedYearFilter)
      .then((rows) => rows[0]),

    // Team competitors in hosted comps
    db
      .select({
        total: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(hostedYearFilter, eq(person.stateId, stateId)))
      .then((rows) => rows[0]),

    // Popular events by round count in hosted comps
    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        rounds: sql<number>`COUNT(DISTINCT (${result.competitionId} || ':' || ${result.roundTypeId}))::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(hostedYearFilter)
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(
          sql`COUNT(DISTINCT (${result.competitionId} || ':' || ${result.roundTypeId}))`,
        ),
        asc(event.rank),
      )
      .limit(TOP_N),

    // Solves / DNFs in hosted comps
    db
      .select({
        totalSolves: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0)::int`,
        totalDnfs: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} = -1)::int`,
        totalAttempts: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0 OR ${resultAttempts.value} = -1)::int`,
      })
      .from(resultAttempts)
      .innerJoin(result, eq(resultAttempts.resultId, result.id))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(hostedYearFilter)
      .then((rows) => rows[0]),

    // Visitors from other Mexican states
    db
      .select({
        stateId: person.stateId,
        stateName: state.name,
        competitors: countDistinct(person.wcaId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(state, eq(person.stateId, state.id))
      .where(
        and(
          hostedYearFilter,
          isNotNull(person.stateId),
          ne(person.stateId, stateId),
        ),
      )
      .groupBy(person.stateId, state.name)
      .orderBy(desc(countDistinct(person.wcaId)), asc(state.name))
      .limit(TOP_N),

    // Recurring visitors: other-state people in ≥2 hosted comps
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          hostedYearFilter,
          isNotNull(person.stateId),
          ne(person.stateId, stateId),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .having(sql`COUNT(DISTINCT ${result.competitionId}) >= 2`)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name))
      .limit(TOP_N),
  ]);
}

export async function countNewcomers({
  stateId,
  year,
  hostedYearFilter,
}: TeamSummaryContext): Promise<number> {
  // Newcomers: team members whose first-ever competition is in this year
  // and who competed in a hosted competition this year.
  const newcomerRows = await db
    .select({
      wcaId: person.wcaId,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(and(hostedYearFilter, eq(person.stateId, stateId)))
    .groupBy(person.wcaId);

  const newcomerWcaIds = newcomerRows.map((r) => r.wcaId);
  let newcomers = 0;
  if (newcomerWcaIds.length > 0) {
    const firstCompRows = await db
      .select({
        wcaId: result.personId,
        firstYear: sql<number>`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(inArray(result.personId, newcomerWcaIds))
      .groupBy(result.personId);

    newcomers = firstCompRows.filter(
      (r) => Number(r.firstYear) === year,
    ).length;
  }

  return newcomers;
}
