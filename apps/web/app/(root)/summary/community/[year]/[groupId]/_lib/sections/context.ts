import "server-only";

import { competition, groupMembership, person } from "@workspace/db/schema";
import { and, gte, lt, sql, type SQL } from "drizzle-orm";

export const TOP_N = 10;

type YearRange = { start: Date; end: Date };

export type CommunitySummaryContext = {
  groupId: string;
  year: number;
  memberYearFilter: SQL | undefined;
};

function memberFilter(groupId: string, { start, end }: YearRange) {
  return and(
    sql`${person.wcaId} IN (
      SELECT ${groupMembership.personId}
      FROM ${groupMembership}
      WHERE ${groupMembership.groupId} = ${groupId}
        AND ${groupMembership.hideFromRoster} = false
    )`,
    gte(competition.startDate, start),
    lt(competition.startDate, end),
  );
}

/** Membership predicate for lifetime queries (debuts, first podium year). */
export function communityMemberPredicate(groupId: string) {
  return sql`${person.wcaId} IN (
    SELECT ${groupMembership.personId}
    FROM ${groupMembership}
    WHERE ${groupMembership.groupId} = ${groupId}
      AND ${groupMembership.hideFromRoster} = false
  )`;
}

export function buildCommunitySummaryContext({
  groupId,
  year,
  yearRange,
}: {
  groupId: string;
  year: number;
  yearRange: YearRange;
}): CommunitySummaryContext {
  return {
    groupId,
    year,
    memberYearFilter: memberFilter(groupId, yearRange),
  };
}
