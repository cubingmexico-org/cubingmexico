import "server-only";

import { db } from "@workspace/db";
import { group } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";
import { assembleCommunityAnnualSummary } from "./assemble";
import { buildCommunitySummaryContext } from "./sections/context";
import {
  flattenRegionalRecords,
  queryPodiumsRecordsSection,
} from "./sections/podiums-records";
import { queryRosterDebuts } from "./sections/roster";
import { querySeasonSection } from "./sections/season";
import { queryTravelSection } from "./sections/travel";
import type { CommunityAnnualSummary } from "./types";
import {
  getAvailableCommunitySummaryYears,
  getCommunitySummaryYears,
  yearBounds,
} from "./years";

export type {
  CommunityAnnualSummary,
  CommunitySummaryCompetitorCount,
  CommunitySummaryPerson,
} from "./types";

async function getCommunityAnnualSummaryCached(
  groupId: string,
  year: number,
): Promise<CommunityAnnualSummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`community-summary-v1-${year}-${groupId}`);

  const [groupRow] = await db
    .select({
      id: group.id,
      name: group.name,
      image: group.image,
      regionLabel: group.regionLabel,
      kind: group.kind,
      isActive: group.isActive,
    })
    .from(group)
    .where(and(eq(group.id, groupId), eq(group.kind, "community")))
    .limit(1);

  if (!groupRow || !groupRow.isActive) {
    return null;
  }

  const activityYears = await getCommunitySummaryYears(groupId);
  if (!activityYears.includes(year)) {
    return null;
  }

  const ctx = buildCommunitySummaryContext({
    groupId,
    year,
    yearRange: yearBounds(year),
  });

  const [season, travel, podiumsRecords, debuts] = await Promise.all([
    querySeasonSection(ctx),
    queryTravelSection(ctx),
    queryPodiumsRecordsSection(ctx),
    queryRosterDebuts(ctx),
  ]);

  return assembleCommunityAnnualSummary({
    community: {
      id: groupRow.id,
      name: groupRow.name,
      image: groupRow.image,
      regionLabel: groupRow.regionLabel,
    },
    year,
    rows: { season, travel, podiumsRecords, debuts },
    regionalRecords: flattenRegionalRecords(podiumsRecords[6]),
  });
}

export async function getCommunityAnnualSummary(
  groupId: string,
  year: number,
): Promise<CommunityAnnualSummary | null> {
  if (!isSummaryYearPublished(year)) {
    return null;
  }

  const summary = await getCommunityAnnualSummaryCached(groupId, year);
  if (!summary) {
    return null;
  }

  const availableYears = await getAvailableCommunitySummaryYears(groupId);
  return { ...summary, availableYears };
}
