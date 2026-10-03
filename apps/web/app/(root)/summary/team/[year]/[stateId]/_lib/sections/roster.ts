import "server-only";

import { db } from "@workspace/db";
import { competition, person, result } from "@workspace/db/schema";
import { and, asc, countDistinct, eq, gt, inArray, sql } from "drizzle-orm";
import { type TeamSummaryContext } from "./context";

export function queryRosterSection({
  stateId,
  year,
  includePrevYear,
  memberYearFilter,
  prevHostedYearFilter,
  prevMemberYearFilter,
  awayLocationFilter,
}: TeamSummaryContext) {
  return Promise.all([
    // Roster debuts: members whose first-ever WCA year is this year
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(eq(person.stateId, stateId))
      .groupBy(person.wcaId, person.name)
      .having(
        sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
      )
      .orderBy(asc(person.name)),

    // First time competing away from home state
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(eq(person.stateId, stateId), awayLocationFilter))
      .groupBy(person.wcaId, person.name)
      .having(
        sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
      )
      .orderBy(asc(person.name)),

    // Previous year season (for YoY)
    includePrevYear
      ? db
          .select({
            activeMembers: countDistinct(result.personId),
          })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .innerJoin(person, eq(result.personId, person.wcaId))
          .where(prevMemberYearFilter)
          .then((rows) => rows[0])
      : Promise.resolve({ activeMembers: 0 }),

    includePrevYear
      ? db
          .select({
            competitionCount: countDistinct(competition.id),
          })
          .from(competition)
          .where(prevHostedYearFilter)
          .then((rows) => rows[0])
      : Promise.resolve({ competitionCount: 0 }),

    includePrevYear
      ? db
          .select({
            gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
            silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
            bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
          })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .innerJoin(person, eq(result.personId, person.wcaId))
          .where(
            and(
              prevMemberYearFilter,
              inArray(result.roundTypeId, ["f", "c"]),
              inArray(result.pos, [1, 2, 3]),
              gt(result.best, 0),
            ),
          )
          .then((rows) => rows[0])
      : Promise.resolve({ gold: 0, silver: 0, bronze: 0 }),

    // Prev-year active member ids (retention)
    includePrevYear
      ? db
          .selectDistinct({ wcaId: person.wcaId })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .innerJoin(person, eq(result.personId, person.wcaId))
          .where(prevMemberYearFilter)
      : Promise.resolve([] as { wcaId: string }[]),

    // This-year active member ids (retention)
    db
      .selectDistinct({ wcaId: person.wcaId })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter),

    // Full roster for team Kinch/SoR (current membership)
    db
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(eq(person.stateId, stateId)),
  ]);
}
