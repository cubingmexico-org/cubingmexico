import "server-only";

import { db } from "@workspace/db";
import { competition, person, result, state, team } from "@workspace/db/schema";
import { and, eq, gte, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";
import { computeTeamYearKinchSor } from "../../../../[year]/[wcaId]/_lib/summary-extra";
import { type TeamSummaryContext } from "./sections/context";
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
import type {
  TeamSummaryPerson,
  TeamSummaryCrossedTeam,
  TeamSummaryBiggestTurnout,
  TeamSummarySeason,
  TeamSummaryGrowth,
  TeamSummaryRetention,
  TeamSummaryDominantEvent,
  TeamSummaryRecurringVisitor,
  TeamSummaryDiverseComp,
  TeamAnnualSummary,
} from "./types";

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

function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

async function getTeamSummaryYears(stateId: string): Promise<number[]> {
  "use cache";
  cacheLife("days");
  cacheTag(`team-summary-years-${stateId}`);

  const yearSql = sql<number>`EXTRACT(YEAR FROM ${competition.startDate} AT TIME ZONE 'UTC')::int`;

  const [hostedYears, memberYears] = await Promise.all([
    db
      .select({ year: yearSql })
      .from(competition)
      .where(eq(competition.stateId, stateId))
      .groupBy(yearSql),
    db
      .select({ year: yearSql })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(eq(person.stateId, stateId))
      .groupBy(yearSql),
  ]);

  const years = new Set<number>();
  for (const row of hostedYears) {
    const y = Number(row.year);
    if (!Number.isNaN(y)) years.add(y);
  }
  for (const row of memberYears) {
    const y = Number(row.year);
    if (!Number.isNaN(y)) years.add(y);
  }

  return Array.from(years).sort((a, b) => b - a);
}

export async function getAvailableTeamSummaryYears(
  stateId: string,
): Promise<number[]> {
  const years = await getTeamSummaryYears(stateId);
  return years.filter((year) => isSummaryYearPublished(year));
}

async function getTeamAnnualSummaryCached(
  stateId: string,
  year: number,
): Promise<TeamAnnualSummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(`team-summary-v4-${year}-${stateId}`);

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

  const { start: yearStart, end: yearEnd } = yearBounds(year);
  const prevYear = year - 1;
  const { start: prevYearStart, end: prevYearEnd } = yearBounds(prevYear);
  const includePrevYear =
    isSummaryYearPublished(prevYear) && activityYears.includes(prevYear);

  const hostedYearFilter = and(
    eq(competition.stateId, stateId),
    gte(competition.startDate, yearStart),
    lt(competition.startDate, yearEnd),
    eq(competition.cancelled, false),
  );

  const memberYearFilter = and(
    eq(person.stateId, stateId),
    gte(competition.startDate, yearStart),
    lt(competition.startDate, yearEnd),
  );

  const prevHostedYearFilter = and(
    eq(competition.stateId, stateId),
    gte(competition.startDate, prevYearStart),
    lt(competition.startDate, prevYearEnd),
    eq(competition.cancelled, false),
  );

  const prevMemberYearFilter = and(
    eq(person.stateId, stateId),
    gte(competition.startDate, prevYearStart),
    lt(competition.startDate, prevYearEnd),
  );

  const awayLocationFilter = or(
    ne(competition.countryId, "Mexico"),
    and(
      eq(competition.countryId, "Mexico"),
      isNotNull(competition.stateId),
      ne(competition.stateId, stateId),
    ),
  );

  const ctx: TeamSummaryContext = {
    stateId,
    year,
    includePrevYear,
    hostedYearFilter,
    memberYearFilter,
    prevHostedYearFilter,
    prevMemberYearFilter,
    awayLocationFilter,
  };

  const [
    [
      hostedIntro,
      biggestCompRows,
      totalCompetitorsRow,
      teamCompetitorsRow,
      popularEventRows,
      solveRows,
      visitorRows,
      recurringVisitorRows,
    ],
    [seasonIntro, biggestTurnoutRows, mostActiveRows],
    [foreignRows, foreignTopRows, otherStateRows, otherStateCompetitorRow],
    [
      podiumAggRows,
      topPodiumerRows,
      dominantEventRows,
      srEventRows,
      recordTotals,
      topSrBreakerRows,
      regionalRecordRows,
      championshipRows,
      firstPodiumYearRows,
    ],
    [
      debutRows,
      firstTimeAwayRows,
      prevSeasonIntro,
      prevHostedIntro,
      prevPodiumAggRows,
      prevActiveMemberRows,
      activeMemberRows,
      rosterMemberRows,
    ],
    [newDelegateCandidates, hostedOrganizerRows, hostedDelegateRows],
  ] = await Promise.all([
    queryHostedSection(ctx),
    querySeasonSection(ctx),
    queryTravelSection(ctx),
    queryPodiumsRecordsSection(ctx),
    queryRosterSection(ctx),
    queryStaffSection(ctx),
  ]);

  const { crossedTeamRows, mostDiverseCompRows } = await queryCrossedTeams(ctx);

  const newcomers = await countNewcomers(ctx);

  const championshipPodiumRows =
    await buildChampionshipPodiumRows(championshipRows);

  const newDelegates = buildNewDelegates(
    newDelegateCandidates,
    yearStart,
    yearEnd,
  );

  const regionalRecords = flattenRegionalRecords(regionalRecordRows);

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
    firstCompetitionDate: seasonIntro?.firstCompetitionDate
      ? String(seasonIntro.firstCompetitionDate)
      : null,
    lastCompetitionDate: seasonIntro?.lastCompetitionDate
      ? String(seasonIntro.lastCompetitionDate)
      : null,
  };

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
    .filter(
      (row): row is typeof row & { stateId: string } => row.stateId !== null,
    )
    .map((row) => ({
      stateId: row.stateId,
      teamName: row.teamName,
      teamImage: row.teamImage,
      sharedCompetitions: Number(row.sharedCompetitions),
      competitorsMet: Number(row.competitorsMet),
    }));

  const debuts = debutRows.length;

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
        prevYear,
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

  const rosterMemberIds = rosterMemberRows.map((r) => r.wcaId);
  const kinchSor = await computeTeamYearKinchSor(
    rosterMemberIds,
    yearStart,
    yearEnd,
  );

  // Empty activity in year (shouldn't happen if years include it, but guard)
  const hasMemberActivity =
    season.activeMembers > 0 ||
    mostActiveRows.length > 0 ||
    gold + silver + bronze > 0;
  if (competitionCount === 0 && !hasMemberActivity) {
    return null;
  }

  return {
    team: {
      stateId: teamRow.stateId,
      name: teamRow.name,
      stateName: teamRow.stateName,
      image: teamRow.image,
    },
    year,
    availableYears: [],
    hosted: {
      competitionCount,
      firstCompetitionDate: hostedIntro?.firstCompetitionDate
        ? String(hostedIntro.firstCompetitionDate)
        : null,
      lastCompetitionDate: hostedIntro?.lastCompetitionDate
        ? String(hostedIntro.lastCompetitionDate)
        : null,
      biggestCompetition: biggest
        ? {
            id: biggest.id,
            name: biggest.name,
            competitors: Number(biggest.competitors),
          }
        : null,
      totalCompetitors: Number(totalCompetitorsRow?.total ?? 0),
      teamCompetitors: Number(teamCompetitorsRow?.total ?? 0),
      newcomers,
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
      visitors: visitorRows
        .filter(
          (row): row is typeof row & { stateId: string } =>
            row.stateId !== null,
        )
        .map((row) => ({
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
      debuts,
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
        byState: otherStateRows
          .filter(
            (row): row is typeof row & { stateId: string } =>
              row.stateId !== null,
          )
          .map((row) => ({
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
        regionalRecords,
      },
      kinchSor,
    },
    staff: {
      newDelegates,
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
