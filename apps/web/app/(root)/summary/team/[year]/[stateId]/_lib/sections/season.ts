import "server-only";

import { db } from "@workspace/db";
import { competition, person, result } from "@workspace/db/schema";
import { asc, countDistinct, desc, eq, sql } from "drizzle-orm";
import { inOfficialEvents } from "@/lib/official-events";
import { TOP_N, type TeamSummaryContext } from "./context";

export function querySeasonSection({ memberYearFilter }: TeamSummaryContext) {
  const isOfficialResult = inOfficialEvents(result.eventId);

  return Promise.all([
    // Member season intro
    db
      .select({
        activeMembers: countDistinct(result.personId),
        competitionCount: countDistinct(result.competitionId),
        eventCount: sql<number>`(COUNT(DISTINCT ${result.eventId}) FILTER (WHERE ${isOfficialResult}))::int`,
        roundCount: sql<number>`(COUNT(DISTINCT (${result.competitionId} || ':' || ${result.eventId} || ':' || ${result.roundTypeId})) FILTER (WHERE ${isOfficialResult}))::int`,
        firstCompetitionDate: sql<string>`MIN(${competition.startDate})`,
        lastCompetitionDate: sql<string>`MAX(${competition.endDate})`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .then((rows) => rows[0]),

    // Biggest team turnout at a single competition
    db
      .select({
        competitionId: competition.id,
        competitionName: competition.name,
        memberCount: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .groupBy(competition.id, competition.name)
      .orderBy(desc(countDistinct(result.personId)), asc(competition.name))
      .limit(1),

    // Most active team members
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name))
      .limit(TOP_N),
  ]);
}
