import type { queryPodiumsRecordsSection } from "./sections/podiums-records";
import type { queryRosterDebuts } from "./sections/roster";
import type { querySeasonSection } from "./sections/season";
import type { queryTravelSection } from "./sections/travel";
import type {
  CommunityAnnualSummary,
  CommunitySummaryBiggestTurnout,
  CommunitySummaryDominantEvent,
  CommunitySummarySeason,
} from "./types";

export type CommunitySummarySectionRows = {
  season: Awaited<ReturnType<typeof querySeasonSection>>;
  travel: Awaited<ReturnType<typeof queryTravelSection>>;
  podiumsRecords: Awaited<ReturnType<typeof queryPodiumsRecordsSection>>;
  debuts: Awaited<ReturnType<typeof queryRosterDebuts>>;
};

const optionalDate = (value: unknown): string | null =>
  value ? String(value) : null;

const hasStateId = <T extends { stateId: string | null }>(
  row: T,
): row is T & { stateId: string } => row.stateId !== null;

export function assembleCommunityAnnualSummary({
  community,
  year,
  rows,
  regionalRecords,
}: {
  community: CommunityAnnualSummary["community"];
  year: number;
  rows: CommunitySummarySectionRows;
  regionalRecords: CommunityAnnualSummary["records"]["regionalRecords"];
}): CommunityAnnualSummary | null {
  const [seasonIntro, biggestTurnoutRows, mostActiveRows] = rows.season;
  const [foreignRows, foreignTopRows, visitedStateRows, visitedCompetitorRow] =
    rows.travel;
  const [
    podiumAggRows,
    topPodiumerRows,
    dominantEventRows,
    srEventRows,
    recordTotals,
    topSrBreakerRows,
    ,
    firstPodiumYearRows,
  ] = rows.podiumsRecords;

  const gold = Number(podiumAggRows?.gold ?? 0);
  const silver = Number(podiumAggRows?.silver ?? 0);
  const bronze = Number(podiumAggRows?.bronze ?? 0);

  const season: CommunitySummarySeason = {
    activeMembers: Number(seasonIntro?.activeMembers ?? 0),
    competitionCount: Number(seasonIntro?.competitionCount ?? 0),
    eventCount: Number(seasonIntro?.eventCount ?? 0),
    roundCount: Number(seasonIntro?.roundCount ?? 0),
    firstCompetitionDate: optionalDate(seasonIntro?.firstCompetitionDate),
    lastCompetitionDate: optionalDate(seasonIntro?.lastCompetitionDate),
  };

  const hasMemberActivity =
    season.activeMembers > 0 ||
    mostActiveRows.length > 0 ||
    gold + silver + bronze > 0;
  if (!hasMemberActivity) {
    return null;
  }

  const turnoutRow = biggestTurnoutRows[0] ?? null;
  const biggestTurnout: CommunitySummaryBiggestTurnout | null =
    turnoutRow && Number(turnoutRow.memberCount) >= 2
      ? {
          competitionId: turnoutRow.competitionId,
          competitionName: turnoutRow.competitionName,
          memberCount: Number(turnoutRow.memberCount),
        }
      : null;

  const dominantEvents: CommunitySummaryDominantEvent[] = dominantEventRows.map(
    (row) => ({
      eventId: row.eventId,
      eventName: row.eventName,
      eventRank: row.eventRank,
      total: Number(row.total),
      gold: Number(row.gold),
      silver: Number(row.silver),
      bronze: Number(row.bronze),
    }),
  );

  return {
    community,
    year,
    availableYears: [],
    season,
    biggestTurnout,
    mostActive: mostActiveRows.map((row) => ({
      wcaId: row.wcaId,
      name: row.name,
      competitions: Number(row.competitions),
    })),
    debuts: rows.debuts.length,
    dominantEvents,
    foreign: {
      competitorCount: Number(foreignRows?.competitorCount ?? 0),
      competitionCount: Number(foreignRows?.competitionCount ?? 0),
      topTravelers: foreignTopRows.map((row) => ({
        wcaId: row.wcaId,
        name: row.name,
        competitions: Number(row.competitions),
      })),
    },
    visitedStates: {
      competitorCount: Number(visitedCompetitorRow?.competitorCount ?? 0),
      byState: visitedStateRows.filter(hasStateId).map((row) => ({
        stateId: row.stateId,
        stateName: row.stateName,
        competitors: Number(row.competitors),
        competitions: Number(row.competitions),
      })),
    },
    podiums: {
      total: gold + silver + bronze,
      gold,
      silver,
      bronze,
      topPodiumers: topPodiumerRows.map((row) => ({
        wcaId: row.wcaId,
        name: row.name,
        total: Number(row.total),
        gold: Number(row.gold),
        silver: Number(row.silver),
        bronze: Number(row.bronze),
      })),
      firstTimePodiumers: firstPodiumYearRows.map((row) => ({
        wcaId: row.wcaId,
        name: row.name,
      })),
    },
    records: {
      sr: Number(recordTotals?.sr ?? 0),
      nr: Number(recordTotals?.nr ?? 0),
      nar: Number(recordTotals?.nar ?? 0),
      wr: Number(recordTotals?.wr ?? 0),
      byEventSr: srEventRows.map((row) => ({
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: row.eventRank,
        single: Number(row.single),
        average: Number(row.average),
      })),
      topSrBreakers: topSrBreakerRows
        .filter((row) => Number(row.count) > 0)
        .map((row) => ({
          wcaId: row.wcaId,
          name: row.name,
          count: Number(row.count),
        })),
      regionalRecords,
    },
  };
}
