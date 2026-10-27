import "server-only";

import { db } from "@workspace/db";
import { competition, person, result } from "@workspace/db/schema";
import { inOfficialEvents } from "@/lib/official-events";
import { and, countDistinct, eq, gte, lt, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  computeRankProgress,
  computeTeammates,
  computeTravelKm,
  computeYearChampionshipPodiums,
  computeYearKinchSor,
  computeYearMollerz,
  computeYearPrStreak,
  computeYearRecords,
  computeYearStaff,
  enhanceStatesWithFirstTime,
} from "./summary-extra";
import { isSummaryYearPublished } from "../../../_lib/summary-year";
import { computeSharedCubers } from "./queries/cubers";
import { computeYearPersonalBests } from "./queries/personal-bests";
import {
  computeYearPodiums,
  computeYearSolves,
} from "./queries/podiums-solves";
import { computeYearStates } from "./queries/states";
import type { AnnualSummary } from "./queries/types";
import {
  getAvailableSummaryYears,
  getCompetedSummaryYears,
  yearBounds,
} from "./queries/years";

export type { SharedCuber, StateVisits } from "./summary-extra";
export type {
  AnnualSummary,
  AnnualSummaryPerson,
  PodiumByEvent,
  PrBreaksByEvent,
  PrImprovement,
  SharedCompetitionBucket,
  SolvesByEvent,
} from "./queries/types";
export { getAvailableSummaryYears } from "./queries/years";

async function getAnnualSummaryCached(
  wcaId: string,
  year: number,
): Promise<AnnualSummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`person-summary-v7-${year}-${wcaId}`);

  const [personRow] = await db
    .select({
      wcaId: person.wcaId,
      name: person.name,
      gender: person.gender,
      stateId: person.stateId,
    })
    .from(person)
    .where(eq(person.wcaId, wcaId))
    .limit(1);

  if (!personRow) {
    return null;
  }

  const competedYears = await getCompetedSummaryYears(wcaId);
  if (!competedYears.includes(year)) {
    return null;
  }

  // availableYears is filled by the non-cached wrapper
  const availableYears: number[] = [];

  const { start: yearStart, end: yearEnd } = yearBounds(year);

  const yearCompFilter = and(
    eq(result.personId, wcaId),
    gte(competition.startDate, yearStart),
    lt(competition.startDate, yearEnd),
  );
  // Event-level counts (rounds, podiums, solves, PRs) use the official scope;
  // competition-level ones (competitions, cubers, states) count every result.
  const isOfficialResult = inOfficialEvents(result.eventId);
  const yearOfficialFilter = and(yearCompFilter, isOfficialResult);

  const [introRow] = await db
    .select({
      competitionCount: countDistinct(result.competitionId),
      roundCount: sql<number>`(COUNT(*) FILTER (WHERE ${isOfficialResult}))::int`,
      eventCount: sql<number>`(COUNT(DISTINCT ${result.eventId}) FILTER (WHERE ${isOfficialResult}))::int`,
      firstCompetitionDate: sql<string>`MIN(${competition.startDate})`,
      lastCompetitionDate: sql<string>`MAX(${competition.endDate})`,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .where(yearCompFilter);

  const competitionCount = Number(introRow?.competitionCount ?? 0);
  if (competitionCount === 0) {
    return null;
  }

  const podiums = await computeYearPodiums(yearOfficialFilter);
  const solves = await computeYearSolves(yearOfficialFilter);
  const personalBests = await computeYearPersonalBests(
    wcaId,
    yearStart,
    yearEnd,
  );
  const { sharedCubers, distribution, repeated } = await computeSharedCubers(
    wcaId,
    yearCompFilter,
  );
  const states = await computeYearStates(yearCompFilter);

  const statesEnhanced = await enhanceStatesWithFirstTime(
    wcaId,
    yearStart,
    states,
  );

  const [
    records,
    championshipPodiums,
    prStreak,
    travelKm,
    teammates,
    rankProgress,
    mollerz,
    kinchSor,
    staff,
  ] = await Promise.all([
    computeYearRecords(wcaId, yearStart, yearEnd),
    computeYearChampionshipPodiums(wcaId, yearStart, yearEnd),
    computeYearPrStreak(wcaId, yearStart, yearEnd),
    computeTravelKm(wcaId, yearStart, yearEnd),
    computeTeammates(wcaId, personRow.stateId, sharedCubers),
    computeRankProgress(wcaId, personRow.stateId, yearStart, yearEnd),
    computeYearMollerz(wcaId, yearStart, yearEnd),
    computeYearKinchSor(wcaId, yearStart, yearEnd),
    computeYearStaff(wcaId, yearStart, yearEnd),
  ]);

  return {
    person: {
      wcaId: personRow.wcaId,
      name: personRow.name,
      gender: personRow.gender,
      stateId: personRow.stateId,
    },
    year,
    availableYears,
    competitionCount,
    roundCount: Number(introRow?.roundCount ?? 0),
    eventCount: Number(introRow?.eventCount ?? 0),
    firstCompetitionDate: String(introRow?.firstCompetitionDate ?? ""),
    lastCompetitionDate: String(introRow?.lastCompetitionDate ?? ""),
    podiums,
    records,
    championshipPodiums,
    prStreak,
    solves,
    personalBests,
    cubers: {
      total: sharedCubers.length,
      repeated,
      topShared: sharedCubers.slice(0, 10),
      distribution,
      teammates,
    },
    states: statesEnhanced,
    travelKm,
    rankProgress,
    kinchSor,
    mollerz,
    staff,
  };
}

export async function getAnnualSummary(
  wcaId: string,
  year: number,
): Promise<AnnualSummary | null> {
  if (!isSummaryYearPublished(year)) {
    return null;
  }

  const summary = await getAnnualSummaryCached(wcaId, year);
  if (!summary) {
    return null;
  }

  const availableYears = await getAvailableSummaryYears(wcaId);
  return { ...summary, availableYears };
}
