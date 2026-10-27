import "server-only";

import { competition, person } from "@workspace/db/schema";
import { and, eq, gte, isNotNull, lt, ne, or } from "drizzle-orm";

export const FEATURED_CHAMPIONSHIP_TYPES = [
  "MX",
  "_North America",
  "world",
] as const;
export const TOP_N = 10;

type SqlFilter = ReturnType<typeof and>;

export type TeamSummaryContext = {
  stateId: string;
  year: number;
  includePrevYear: boolean;
  hostedYearFilter: SqlFilter;
  memberYearFilter: SqlFilter;
  prevHostedYearFilter: SqlFilter;
  prevMemberYearFilter: SqlFilter;
  awayLocationFilter: SqlFilter;
};

type YearRange = { start: Date; end: Date };

function hostedFilter(stateId: string, { start, end }: YearRange): SqlFilter {
  return and(
    eq(competition.stateId, stateId),
    gte(competition.startDate, start),
    lt(competition.startDate, end),
    eq(competition.cancelled, false),
  );
}

function memberFilter(stateId: string, { start, end }: YearRange): SqlFilter {
  return and(
    eq(person.stateId, stateId),
    gte(competition.startDate, start),
    lt(competition.startDate, end),
  );
}

/** The filters every section query shares, for one team and year. */
export function buildTeamSummaryContext({
  stateId,
  year,
  includePrevYear,
  yearRange,
  prevYearRange,
}: {
  stateId: string;
  year: number;
  includePrevYear: boolean;
  yearRange: YearRange;
  prevYearRange: YearRange;
}): TeamSummaryContext {
  return {
    stateId,
    year,
    includePrevYear,
    hostedYearFilter: hostedFilter(stateId, yearRange),
    memberYearFilter: memberFilter(stateId, yearRange),
    prevHostedYearFilter: hostedFilter(stateId, prevYearRange),
    prevMemberYearFilter: memberFilter(stateId, prevYearRange),
    awayLocationFilter: or(
      ne(competition.countryId, "Mexico"),
      and(
        eq(competition.countryId, "Mexico"),
        isNotNull(competition.stateId),
        ne(competition.stateId, stateId),
      ),
    ),
  };
}
