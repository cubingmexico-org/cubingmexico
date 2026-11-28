import "server-only";

import { db } from "@workspace/db";
import { competition, person, result, state } from "@workspace/db/schema";
import { and, asc, countDistinct, desc, eq, isNotNull, ne } from "drizzle-orm";
import { TOP_N, type CommunitySummaryContext } from "./context";

export function queryTravelSection({
  memberYearFilter,
}: CommunitySummaryContext) {
  return Promise.all([
    db
      .select({
        competitorCount: countDistinct(result.personId),
        competitionCount: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(memberYearFilter, ne(competition.countryId, "Mexico")))
      .then((rows) => rows[0]),

    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(memberYearFilter, ne(competition.countryId, "Mexico")))
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name))
      .limit(TOP_N),

    db
      .select({
        stateId: competition.stateId,
        stateName: state.name,
        competitors: countDistinct(result.personId),
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(state, eq(competition.stateId, state.id))
      .where(
        and(
          memberYearFilter,
          eq(competition.countryId, "Mexico"),
          isNotNull(competition.stateId),
        ),
      )
      .groupBy(competition.stateId, state.name)
      .orderBy(desc(countDistinct(result.personId)), asc(state.name)),

    db
      .select({
        competitorCount: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          eq(competition.countryId, "Mexico"),
          isNotNull(competition.stateId),
        ),
      )
      .then((rows) => rows[0]),
  ]);
}
