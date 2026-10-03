import "server-only";

import type { and } from "drizzle-orm";

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
