import type { queryHostedSection } from "./sections/hosted";
import type { querySeasonSection } from "./sections/season";
import type { queryCrossedTeams, queryTravelSection } from "./sections/travel";
import type { queryPodiumsRecordsSection } from "./sections/podiums-records";
import type { queryRosterSection } from "./sections/roster";
import type { queryStaffSection } from "./sections/staff";
import type {
  TeamAnnualSummary,
  TeamSummaryBiggestTurnout,
  TeamSummaryCrossedTeam,
  TeamSummaryDiverseComp,
  TeamSummaryDominantEvent,
  TeamSummaryGrowth,
  TeamSummaryPerson,
  TeamSummaryRecurringVisitor,
  TeamSummaryRetention,
  TeamSummarySeason,
} from "./types";

/** Raw rows from the section queries, as they come back from Postgres. */
export type TeamSummarySectionRows = {
  hosted: Awaited<ReturnType<typeof queryHostedSection>>;
  season: Awaited<ReturnType<typeof querySeasonSection>>;
  travel: Awaited<ReturnType<typeof queryTravelSection>>;
  podiumsRecords: Awaited<ReturnType<typeof queryPodiumsRecordsSection>>;
  roster: Awaited<ReturnType<typeof queryRosterSection>>;
  staff: Awaited<ReturnType<typeof queryStaffSection>>;
  crossed: Awaited<ReturnType<typeof queryCrossedTeams>>;
};

type Members = TeamAnnualSummary["members"];

/** Values computed from the rows with further queries before assembling. */
export type TeamSummaryDerived = {
  newcomers: TeamAnnualSummary["hosted"]["newcomers"];
  championshipPodiumRows: Members["championshipPodiums"]["rows"];
  newDelegates: TeamAnnualSummary["staff"]["newDelegates"];
  regionalRecords: Members["records"]["regionalRecords"];
  kinchSor: Members["kinchSor"];
};

const optionalDate = (value: unknown): string | null =>
  value ? String(value) : null;

const hasStateId = <T extends { stateId: string | null }>(
  row: T,
): row is T & { stateId: string } => row.stateId !== null;

/**
 * Turns the section rows into the summary shape. Returns null when the team had
 * no hosted competitions and no member activity in the year.
 */
export function assembleTeamAnnualSummary({
  team,
  year,
  includePrevYear,
  rows,
  derived,
}: {
  team: TeamAnnualSummary["team"];
  year: number;
  includePrevYear: boolean;
  rows: TeamSummarySectionRows;
  derived: TeamSummaryDerived;
}): TeamAnnualSummary | null {
  const [
    hostedIntro,
    biggestCompRows,
    totalCompetitorsRow,
    teamCompetitorsRow,
    popularEventRows,
    solveRows,
    visitorRows,
    recurringVisitorRows,
  ] = rows.hosted;
  const [seasonIntro, biggestTurnoutRows, mostActiveRows] = rows.season;
  const [foreignRows, foreignTopRows, otherStateRows, otherStateCompetitorRow] =
    rows.travel;
  const [
    podiumAggRows,
    topPodiumerRows,
    dominantEventRows,
    srEventRows,
    recordTotals,
    topSrBreakerRows,
    ,
    ,
    firstPodiumYearRows,
  ] = rows.podiumsRecords;
  const [
    debutRows,
    firstTimeAwayRows,
    prevSeasonIntro,
    prevHostedIntro,
    prevPodiumAggRows,
    prevActiveMemberRows,
    activeMemberRows,
  ] = rows.roster;
  const [, hostedOrganizerRows, hostedDelegateRows] = rows.staff;
  const { crossedTeamRows, mostDiverseCompRows } = rows.crossed;
  const { championshipPodiumRows } = derived;

  const gold = Number(podiumAggRows?.gold ?? 0);
  const silver = Number(podiumAggRows?.silver ?? 0);
  const bronze = Number(podiumAggRows?.bronze ?? 0);
  const biggest = biggestCompRows[0] ?? null;
  const competitionCount = Number(hostedIntro?.competitionCount ?? 0);

  const season: TeamSummarySeason = {
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
  if (competitionCount === 0 && !hasMemberActivity) {
    return null;
  }

  const turnoutRow = biggestTurnoutRows[0] ?? null;
  const biggestTurnout: TeamSummaryBiggestTurnout | null =
    turnoutRow && Number(turnoutRow.memberCount) >= 2
      ? {
          competitionId: turnoutRow.competitionId,
          competitionName: turnoutRow.competitionName,
          memberCount: Number(turnoutRow.memberCount),
        }
      : null;

  const crossedTeams: TeamSummaryCrossedTeam[] = crossedTeamRows
    .filter(hasStateId)
    .map((row) => ({
      stateId: row.stateId,
      teamName: row.teamName,
      teamImage: row.teamImage,
      sharedCompetitions: Number(row.sharedCompetitions),
      competitorsMet: Number(row.competitorsMet),
    }));

  const firstTimeAway: TeamSummaryPerson[] = firstTimeAwayRows.map((row) => ({
    wcaId: row.wcaId,
    name: row.name,
  }));

  const dominantEvents: TeamSummaryDominantEvent[] = dominantEventRows.map(
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

  const recurringVisitors: TeamSummaryRecurringVisitor[] =
    recurringVisitorRows.map((row) => ({
      wcaId: row.wcaId,
      name: row.name,
      competitions: Number(row.competitions),
    }));

  const diverseRow = mostDiverseCompRows[0] ?? null;
  const mostDiverseComp: TeamSummaryDiverseComp | null =
    diverseRow && Number(diverseRow.distinctTeams) >= 2
      ? {
          competitionId: diverseRow.competitionId,
          competitionName: diverseRow.competitionName,
          distinctTeams: Number(diverseRow.distinctTeams),
        }
      : null;

  const prevActiveMembers = Number(prevSeasonIntro?.activeMembers ?? 0);
  const prevHostedCount = Number(prevHostedIntro?.competitionCount ?? 0);
  const prevPodiums =
    Number(prevPodiumAggRows?.gold ?? 0) +
    Number(prevPodiumAggRows?.silver ?? 0) +
    Number(prevPodiumAggRows?.bronze ?? 0);

  const growth: TeamSummaryGrowth = includePrevYear
    ? {
        prevYear: year - 1,
        activeMembersDelta: season.activeMembers - prevActiveMembers,
        hostedCompetitionsDelta: competitionCount - prevHostedCount,
        podiumsDelta: gold + silver + bronze - prevPodiums,
      }
    : {
        prevYear: null,
        activeMembersDelta: null,
        hostedCompetitionsDelta: null,
        podiumsDelta: null,
      };

  const prevActiveSet = new Set(prevActiveMemberRows.map((r) => r.wcaId));
  const returned = activeMemberRows.filter((r) =>
    prevActiveSet.has(r.wcaId),
  ).length;
  const retention: TeamSummaryRetention = {
    previousActive: includePrevYear ? prevActiveMembers : 0,
    returned: includePrevYear ? returned : 0,
  };

  return {
    team,
    year,
    availableYears: [],
    hosted: {
      competitionCount,
      firstCompetitionDate: optionalDate(hostedIntro?.firstCompetitionDate),
      lastCompetitionDate: optionalDate(hostedIntro?.lastCompetitionDate),
      biggestCompetition: biggest
        ? {
            id: biggest.id,
            name: biggest.name,
            competitors: Number(biggest.competitors),
          }
        : null,
      totalCompetitors: Number(totalCompetitorsRow?.total ?? 0),
      teamCompetitors: Number(teamCompetitorsRow?.total ?? 0),
      newcomers: derived.newcomers,
      popularEvents: popularEventRows.map((row) => ({
        eventId: row.eventId,
        eventName: row.eventName,
        eventRank: row.eventRank,
        rounds: Number(row.rounds),
      })),
      solves: {
        totalSolves: Number(solveRows?.totalSolves ?? 0),
        totalDnfs: Number(solveRows?.totalDnfs ?? 0),
        totalAttempts: Number(solveRows?.totalAttempts ?? 0),
      },
      visitors: visitorRows.filter(hasStateId).map((row) => ({
        stateId: row.stateId,
        stateName: row.stateName,
        competitors: Number(row.competitors),
      })),
      recurringVisitors,
    },
    members: {
      season,
      growth,
      retention,
      biggestTurnout,
      mostDiverseComp,
      crossedTeams,
      debuts: debutRows.length,
      firstTimeAway,
      dominantEvents,
      mostActive: mostActiveRows.map((row) => ({
        wcaId: row.wcaId,
        name: row.name,
        competitions: Number(row.competitions),
      })),
      foreign: {
        competitorCount: Number(foreignRows?.competitorCount ?? 0),
        competitionCount: Number(foreignRows?.competitionCount ?? 0),
        topTravelers: foreignTopRows.map((row) => ({
          wcaId: row.wcaId,
          name: row.name,
          competitions: Number(row.competitions),
        })),
      },
      otherMexicanStates: {
        competitorCount: Number(otherStateCompetitorRow?.competitorCount ?? 0),
        byState: otherStateRows.filter(hasStateId).map((row) => ({
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
      championshipPodiums: {
        total: championshipPodiumRows.length,
        mx: championshipPodiumRows.filter((r) => r.championshipType === "MX")
          .length,
        nac: championshipPodiumRows.filter(
          (r) => r.championshipType === "_North America",
        ).length,
        world: championshipPodiumRows.filter(
          (r) => r.championshipType === "world",
        ).length,
        rows: championshipPodiumRows,
      },
      records: {
        wr: Number(recordTotals?.wr ?? 0),
        nar: Number(recordTotals?.nar ?? 0),
        nr: Number(recordTotals?.nr ?? 0),
        sr: Number(recordTotals?.sr ?? 0),
        byEventSr: srEventRows
          .map((row) => ({
            eventId: row.eventId,
            eventName: row.eventName,
            eventRank: row.eventRank,
            single: Number(row.single),
            average: Number(row.average),
          }))
          .filter((row) => row.single + row.average > 0),
        topSrBreakers: topSrBreakerRows
          .map((row) => ({
            wcaId: row.wcaId,
            name: row.name,
            count: Number(row.count),
          }))
          .filter((row) => row.count > 0),
        regionalRecords: derived.regionalRecords,
      },
      kinchSor: derived.kinchSor,
    },
    staff: {
      newDelegates: derived.newDelegates,
      hostedOrganizers: hostedOrganizerRows.map((row) => ({
        wcaId: row.wcaId,
        name: row.name,
        competitions: Number(row.competitions),
      })),
      hostedDelegates: hostedDelegateRows.map((row) => ({
        wcaId: row.wcaId,
        name: row.name,
        competitions: Number(row.competitions),
      })),
    },
  };
}
