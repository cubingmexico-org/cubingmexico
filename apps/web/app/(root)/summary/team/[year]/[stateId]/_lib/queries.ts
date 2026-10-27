import "server-only";

import { db } from "@workspace/db";
import { state, team } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";
import { computeTeamYearKinchSor } from "../../../../[year]/[wcaId]/_lib/summary-extra";
import { assembleTeamAnnualSummary } from "./assemble";
import { buildTeamSummaryContext } from "./sections/context";
import { countNewcomers, queryHostedSection } from "./sections/hosted";
import { querySeasonSection } from "./sections/season";
import { queryCrossedTeams, queryTravelSection } from "./sections/travel";
import {
  buildChampionshipPodiumRows,
  flattenRegionalRecords,
  queryPodiumsRecordsSection,
} from "./sections/podiums-records";
import { queryRosterSection } from "./sections/roster";
import { buildNewDelegates, queryStaffSection } from "./sections/staff";
import type { TeamAnnualSummary } from "./types";
import {
  getAvailableTeamSummaryYears,
  getTeamSummaryYears,
  yearBounds,
} from "./years";

export type {
  TeamSummaryPerson,
  TeamSummaryCompetitorCount,
  TeamSummaryPodiumer,
  TeamSummaryRecordHolder,
  TeamSummaryRegionalRecord,
  TeamSummaryEventRounds,
  TeamSummaryEventRecords,
  TeamSummaryVisitorState,
  TeamSummaryTravelState,
  TeamSummaryCrossedTeam,
  TeamSummaryBiggestTurnout,
  TeamSummarySeason,
  TeamSummaryGrowth,
  TeamSummaryRetention,
  TeamSummaryDominantEvent,
  TeamSummaryRecurringVisitor,
  TeamSummaryDiverseComp,
  TeamSummaryKinchSor,
  TeamSummaryChampionshipPodium,
  TeamSummaryNewDelegate,
  TeamSummaryStaffMember,
  TeamAnnualSummary,
} from "./types";

async function getTeamAnnualSummaryCached(
  stateId: string,
  year: number,
): Promise<TeamAnnualSummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`team-summary-v5-${year}-${stateId}`);

  const [teamRow] = await db
    .select({
      stateId: team.stateId,
      name: team.name,
      image: team.image,
      stateName: state.name,
    })
    .from(team)
    .innerJoin(state, eq(team.stateId, state.id))
    .where(eq(team.stateId, stateId))
    .limit(1);

  if (!teamRow) {
    return null;
  }

  const activityYears = await getTeamSummaryYears(stateId);
  if (!activityYears.includes(year)) {
    return null;
  }

  const yearRange = yearBounds(year);
  const prevYear = year - 1;
  const includePrevYear =
    isSummaryYearPublished(prevYear) && activityYears.includes(prevYear);

  const ctx = buildTeamSummaryContext({
    stateId,
    year,
    includePrevYear,
    yearRange,
    prevYearRange: yearBounds(prevYear),
  });

  const [hosted, season, travel, podiumsRecords, roster, staff] =
    await Promise.all([
      queryHostedSection(ctx),
      querySeasonSection(ctx),
      queryTravelSection(ctx),
      queryPodiumsRecordsSection(ctx),
      queryRosterSection(ctx),
      queryStaffSection(ctx),
    ]);

  const crossed = await queryCrossedTeams(ctx);
  const newcomers = await countNewcomers(ctx);

  const championshipRows = podiumsRecords[7];
  const regionalRecordRows = podiumsRecords[6];
  const championshipPodiumRows =
    await buildChampionshipPodiumRows(championshipRows);

  const newDelegates = buildNewDelegates(
    staff[0],
    yearRange.start,
    yearRange.end,
  );

  const rosterMemberIds = roster[7].map((r) => r.wcaId);
  const kinchSor = await computeTeamYearKinchSor(
    rosterMemberIds,
    yearRange.start,
    yearRange.end,
  );

  return assembleTeamAnnualSummary({
    team: {
      stateId: teamRow.stateId,
      name: teamRow.name,
      stateName: teamRow.stateName,
      image: teamRow.image,
    },
    year,
    includePrevYear,
    rows: { hosted, season, travel, podiumsRecords, roster, staff, crossed },
    derived: {
      newcomers,
      championshipPodiumRows,
      newDelegates,
      regionalRecords: flattenRegionalRecords(regionalRecordRows),
      kinchSor,
    },
  });
}

export async function getTeamAnnualSummary(
  stateId: string,
  year: number,
): Promise<TeamAnnualSummary | null> {
  if (!isSummaryYearPublished(year)) {
    return null;
  }

  const summary = await getTeamAnnualSummaryCached(stateId, year);
  if (!summary) {
    return null;
  }

  const availableYears = await getAvailableTeamSummaryYears(stateId);
  return { ...summary, availableYears };
}
