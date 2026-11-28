import "server-only";

import { db } from "@workspace/db";
import { competition, person, result } from "@workspace/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import {
  communityMemberPredicate,
  type CommunitySummaryContext,
} from "./context";

/** Members whose first-ever WCA year is the summary year. */
export function queryRosterDebuts({ groupId, year }: CommunitySummaryContext) {
  return db
    .select({
      wcaId: person.wcaId,
      name: person.name,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(communityMemberPredicate(groupId))
    .groupBy(person.wcaId, person.name)
    .having(
      sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
    )
    .orderBy(asc(person.name));
}
