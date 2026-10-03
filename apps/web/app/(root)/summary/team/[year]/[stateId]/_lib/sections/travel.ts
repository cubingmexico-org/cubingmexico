import "server-only";

import { db } from "@workspace/db";
import { competition, person, result, state, team } from "@workspace/db/schema";
import { and, asc, countDistinct, desc, eq, isNotNull, ne } from "drizzle-orm";
import { TOP_N, type TeamSummaryContext } from "./context";

export function queryTravelSection({
  stateId,
  memberYearFilter,
}: TeamSummaryContext) {
  return Promise.all([
    // Foreign competitions aggregate
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

    // Top foreign travelers
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

    // Other Mexican states travel
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
          ne(competition.stateId, stateId),
        ),
      )
      .groupBy(competition.stateId, state.name)
      .orderBy(desc(countDistinct(result.personId)), asc(state.name)),

    // Distinct team members who competed in other Mexican states
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
          ne(competition.stateId, stateId),
        ),
      )
      .then((rows) => rows[0]),
  ]);
}

export async function queryCrossedTeams({
  stateId,
  memberYearFilter,
}: TeamSummaryContext) {
  // Crossed teams: other Mexican states met at comps where team members competed
  const memberComps = db
    .$with("member_comps")
    .as(
      db
        .selectDistinct({ competitionId: result.competitionId })
        .from(result)
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .innerJoin(person, eq(result.personId, person.wcaId))
        .where(memberYearFilter),
    );

  const crossedTeamRows = await db
    .with(memberComps)
    .select({
      stateId: person.stateId,
      teamName: team.name,
      teamImage: team.image,
      sharedCompetitions: countDistinct(result.competitionId),
      competitorsMet: countDistinct(person.wcaId),
    })
    .from(result)
    .innerJoin(memberComps, eq(result.competitionId, memberComps.competitionId))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .innerJoin(team, eq(person.stateId, team.stateId))
    .where(and(isNotNull(person.stateId), ne(person.stateId, stateId)))
    .groupBy(person.stateId, team.name, team.image)
    .orderBy(
      desc(countDistinct(result.competitionId)),
      desc(countDistinct(person.wcaId)),
      asc(team.name),
    )
    .limit(TOP_N);

  const mostDiverseCompRows = await db
    .with(memberComps)
    .select({
      competitionId: competition.id,
      competitionName: competition.name,
      distinctTeams: countDistinct(person.stateId),
    })
    .from(result)
    .innerJoin(memberComps, eq(result.competitionId, memberComps.competitionId))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(and(isNotNull(person.stateId), ne(person.stateId, stateId)))
    .groupBy(competition.id, competition.name)
    .orderBy(desc(countDistinct(person.stateId)), asc(competition.name))
    .limit(1);

  return { crossedTeamRows, mostDiverseCompRows };
}
