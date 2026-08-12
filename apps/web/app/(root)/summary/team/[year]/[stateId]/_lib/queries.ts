import "server-only";

import { db } from "@workspace/db";
import {
  championship,
  competition,
  competitionDelegate,
  competitionOrganizer,
  delegate,
  event,
  organizer,
  person,
  result,
  resultAttempts,
  state,
  team,
} from "@workspace/db/schema";
import type { DelegateLevel } from "@/lib/delegate-level";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { isSummaryYearPublished } from "../../../../_lib/summary-year";
import { computeTeamYearKinchSor } from "../../../../[year]/[wcaId]/_lib/summary-extra";

const FEATURED_CHAMPIONSHIP_TYPES = ["MX", "_North America", "world"] as const;
const TOP_N = 10;

export type TeamSummaryPerson = {
  wcaId: string;
  name: string | null;
};

export type TeamSummaryCompetitorCount = TeamSummaryPerson & {
  competitions: number;
};

export type TeamSummaryPodiumer = TeamSummaryPerson & {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
};

export type TeamSummaryRecordHolder = TeamSummaryPerson & {
  count: number;
};

export type TeamSummaryRegionalRecord = TeamSummaryPerson & {
  eventId: string;
  eventName: string;
  type: "WR" | "NAR" | "NR";
  resultType: "single" | "average";
};

export type TeamSummaryEventRounds = {
  eventId: string;
  eventName: string;
  eventRank: number;
  rounds: number;
};

export type TeamSummaryEventRecords = {
  eventId: string;
  eventName: string;
  eventRank: number;
  single: number;
  average: number;
};

export type TeamSummaryVisitorState = {
  stateId: string;
  stateName: string;
  competitors: number;
};

export type TeamSummaryTravelState = {
  stateId: string;
  stateName: string;
  competitors: number;
  competitions: number;
};

export type TeamSummaryCrossedTeam = {
  stateId: string;
  teamName: string;
  teamImage: string | null;
  sharedCompetitions: number;
  competitorsMet: number;
};

export type TeamSummaryBiggestTurnout = {
  competitionId: string;
  competitionName: string;
  memberCount: number;
};

export type TeamSummarySeason = {
  activeMembers: number;
  competitionCount: number;
  eventCount: number;
  roundCount: number;
  firstCompetitionDate: string | null;
  lastCompetitionDate: string | null;
};

export type TeamSummaryGrowth = {
  prevYear: number | null;
  activeMembersDelta: number | null;
  hostedCompetitionsDelta: number | null;
  podiumsDelta: number | null;
};

export type TeamSummaryRetention = {
  previousActive: number;
  returned: number;
};

export type TeamSummaryDominantEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  total: number;
  gold: number;
  silver: number;
  bronze: number;
};

export type TeamSummaryRecurringVisitor = TeamSummaryPerson & {
  competitions: number;
};

export type TeamSummaryDiverseComp = {
  competitionId: string;
  competitionName: string;
  distinctTeams: number;
};

export type TeamSummaryKinchSor = {
  kinchBefore: number;
  kinchAfter: number;
  sorSingleBefore: number;
  sorSingleAfter: number;
  sorAverageBefore: number;
  sorAverageAfter: number;
};

export type TeamSummaryChampionshipPodium = {
  wcaId: string;
  name: string | null;
  eventId: string;
  eventName: string;
  championshipType: string;
  competitionName: string;
  position: number;
};

export type TeamSummaryNewDelegate = {
  wcaId: string;
  name: string | null;
  level: DelegateLevel | null;
  gender: "m" | "f" | "o" | null;
  firstCompetitionId: string;
  firstCompetitionName: string;
  firstCompetitionDate: string;
};

export type TeamSummaryStaffMember = TeamSummaryPerson & {
  competitions: number;
};

export type TeamAnnualSummary = {
  team: {
    stateId: string;
    name: string;
    stateName: string;
    image: string | null;
  };
  year: number;
  availableYears: number[];
  hosted: {
    competitionCount: number;
    firstCompetitionDate: string | null;
    lastCompetitionDate: string | null;
    biggestCompetition: {
      id: string;
      name: string;
      competitors: number;
    } | null;
    totalCompetitors: number;
    teamCompetitors: number;
    newcomers: number;
    popularEvents: TeamSummaryEventRounds[];
    solves: {
      totalSolves: number;
      totalDnfs: number;
      totalAttempts: number;
    };
    visitors: TeamSummaryVisitorState[];
    recurringVisitors: TeamSummaryRecurringVisitor[];
  };
  members: {
    season: TeamSummarySeason;
    growth: TeamSummaryGrowth;
    retention: TeamSummaryRetention;
    biggestTurnout: TeamSummaryBiggestTurnout | null;
    mostDiverseComp: TeamSummaryDiverseComp | null;
    crossedTeams: TeamSummaryCrossedTeam[];
    debuts: number;
    firstTimeAway: TeamSummaryPerson[];
    dominantEvents: TeamSummaryDominantEvent[];
    mostActive: TeamSummaryCompetitorCount[];
    foreign: {
      competitorCount: number;
      competitionCount: number;
      topTravelers: TeamSummaryCompetitorCount[];
    };
    otherMexicanStates: {
      competitorCount: number;
      byState: TeamSummaryTravelState[];
    };
    podiums: {
      total: number;
      gold: number;
      silver: number;
      bronze: number;
      topPodiumers: TeamSummaryPodiumer[];
      firstTimePodiumers: TeamSummaryPerson[];
    };
    championshipPodiums: {
      total: number;
      mx: number;
      nac: number;
      world: number;
      rows: TeamSummaryChampionshipPodium[];
    };
    records: {
      sr: number;
      nr: number;
      nar: number;
      wr: number;
      byEventSr: TeamSummaryEventRecords[];
      topSrBreakers: TeamSummaryRecordHolder[];
      regionalRecords: TeamSummaryRegionalRecord[];
    };
    kinchSor: TeamSummaryKinchSor;
  };
  staff: {
    newDelegates: TeamSummaryNewDelegate[];
    hostedOrganizers: TeamSummaryStaffMember[];
    hostedDelegates: TeamSummaryStaffMember[];
  };
};

function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

function assignChampionshipPositions<
  T extends { resultId: string; pos: number | null },
>(rows: T[]): (T & { championshipPosition: number })[] {
  const sorted = [...rows].sort(
    (a, b) =>
      (a.pos ?? Number.MAX_SAFE_INTEGER) - (b.pos ?? Number.MAX_SAFE_INTEGER),
  );

  let previousOldPos: number | null = null;
  let previousNewPos = 0;

  return sorted.map((row, index) => {
    const oldPos = row.pos ?? Number.MAX_SAFE_INTEGER;
    const championshipPosition =
      oldPos === previousOldPos ? previousNewPos : index + 1;
    previousOldPos = oldPos;
    previousNewPos = championshipPosition;
    return { ...row, championshipPosition };
  });
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

  const [
    hostedIntro,
    biggestCompRows,
    totalCompetitorsRow,
    teamCompetitorsRow,
    popularEventRows,
    solveRows,
    visitorRows,
    recurringVisitorRows,
    seasonIntro,
    biggestTurnoutRows,
    mostActiveRows,
    foreignRows,
    foreignTopRows,
    otherStateRows,
    otherStateCompetitorRow,
    podiumAggRows,
    topPodiumerRows,
    dominantEventRows,
    srEventRows,
    recordTotals,
    topSrBreakerRows,
    regionalRecordRows,
    championshipRows,
    firstPodiumYearRows,
    debutRows,
    firstTimeAwayRows,
    prevSeasonIntro,
    prevHostedIntro,
    prevPodiumAggRows,
    prevActiveMemberRows,
    activeMemberRows,
    rosterMemberRows,
    newDelegateCandidates,
    hostedOrganizerRows,
    hostedDelegateRows,
  ] = await Promise.all([
    // Hosted intro
    db
      .select({
        competitionCount: countDistinct(competition.id),
        firstCompetitionDate: sql<string>`MIN(${competition.startDate})`,
        lastCompetitionDate: sql<string>`MAX(${competition.endDate})`,
      })
      .from(competition)
      .where(hostedYearFilter)
      .then((rows) => rows[0]),

    // Biggest competition by unique competitors
    db
      .select({
        id: competition.id,
        name: competition.name,
        competitors: countDistinct(result.personId),
      })
      .from(competition)
      .innerJoin(result, eq(result.competitionId, competition.id))
      .where(hostedYearFilter)
      .groupBy(competition.id, competition.name)
      .orderBy(desc(countDistinct(result.personId)))
      .limit(1),

    // Total unique competitors in hosted comps
    db
      .select({
        total: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(hostedYearFilter)
      .then((rows) => rows[0]),

    // Team competitors in hosted comps
    db
      .select({
        total: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(hostedYearFilter, eq(person.stateId, stateId)))
      .then((rows) => rows[0]),

    // Popular events by round count in hosted comps
    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        rounds: sql<number>`COUNT(DISTINCT (${result.competitionId} || ':' || ${result.roundTypeId}))::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(hostedYearFilter)
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(
          sql`COUNT(DISTINCT (${result.competitionId} || ':' || ${result.roundTypeId}))`,
        ),
        asc(event.rank),
      )
      .limit(TOP_N),

    // Solves / DNFs in hosted comps
    db
      .select({
        totalSolves: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0)::int`,
        totalDnfs: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} = -1)::int`,
        totalAttempts: sql<number>`COUNT(*) FILTER (WHERE ${resultAttempts.value} > 0 OR ${resultAttempts.value} = -1)::int`,
      })
      .from(resultAttempts)
      .innerJoin(result, eq(resultAttempts.resultId, result.id))
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(hostedYearFilter)
      .then((rows) => rows[0]),

    // Visitors from other Mexican states
    db
      .select({
        stateId: person.stateId,
        stateName: state.name,
        competitors: countDistinct(person.wcaId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(state, eq(person.stateId, state.id))
      .where(
        and(
          hostedYearFilter,
          isNotNull(person.stateId),
          ne(person.stateId, stateId),
        ),
      )
      .groupBy(person.stateId, state.name)
      .orderBy(desc(countDistinct(person.wcaId)), asc(state.name))
      .limit(TOP_N),

    // Recurring visitors: other-state people in ≥2 hosted comps
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          hostedYearFilter,
          isNotNull(person.stateId),
          ne(person.stateId, stateId),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .having(sql`COUNT(DISTINCT ${result.competitionId}) >= 2`)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name))
      .limit(TOP_N),

    // Member season intro
    db
      .select({
        activeMembers: countDistinct(result.personId),
        competitionCount: countDistinct(result.competitionId),
        eventCount: countDistinct(result.eventId),
        roundCount: sql<number>`COUNT(DISTINCT (${result.competitionId} || ':' || ${result.eventId} || ':' || ${result.roundTypeId}))::int`,
        firstCompetitionDate: sql<string>`MIN(${competition.startDate})`,
        lastCompetitionDate: sql<string>`MAX(${competition.endDate})`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .then((rows) => rows[0]),

    // Biggest team turnout at a single competition
    db
      .select({
        competitionId: competition.id,
        competitionName: competition.name,
        memberCount: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .groupBy(competition.id, competition.name)
      .orderBy(desc(countDistinct(result.personId)), asc(competition.name))
      .limit(1),

    // Most active team members
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name))
      .limit(TOP_N),

    // Foreign competitions aggregate
    db
      .select({
        competitorCount: countDistinct(result.personId),
        competitionCount: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(memberYearFilter, ne(competition.countryId, "Mexico")))
      .then((rows) => rows[0]),

    // Top foreign travelers
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(memberYearFilter, ne(competition.countryId, "Mexico")))
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(result.competitionId)), asc(person.name))
      .limit(TOP_N),

    // Other Mexican states travel
    db
      .select({
        stateId: competition.stateId,
        stateName: state.name,
        competitors: countDistinct(result.personId),
        competitions: countDistinct(result.competitionId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(state, eq(competition.stateId, state.id))
      .where(
        and(
          memberYearFilter,
          eq(competition.countryId, "Mexico"),
          isNotNull(competition.stateId),
          ne(competition.stateId, stateId),
        ),
      )
      .groupBy(competition.stateId, state.name)
      .orderBy(desc(countDistinct(result.personId)), asc(state.name)),

    // Distinct team members who competed in other Mexican states
    db
      .select({
        competitorCount: countDistinct(result.personId),
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          eq(competition.countryId, "Mexico"),
          isNotNull(competition.stateId),
          ne(competition.stateId, stateId),
        ),
      )
      .then((rows) => rows[0]),

    // Podium aggregates
    db
      .select({
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .then((rows) => rows[0]),

    // Top podiumers
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`COUNT(*) FILTER (WHERE ${result.pos} = 1)`),
        asc(person.name),
      )
      .limit(TOP_N),

    // Dominant events: podiums by event
    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
        silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
        bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
        total: sql<number>`COUNT(*)::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(sql`COUNT(*)`),
        desc(sql`COUNT(*) FILTER (WHERE ${result.pos} = 1)`),
        asc(event.rank),
      )
      .limit(TOP_N),

    // SR by event
    db
      .select({
        eventId: result.eventId,
        eventName: event.name,
        eventRank: event.rank,
        single: sql<number>`COUNT(*) FILTER (WHERE ${result.stateSingleRecord} = 'SR')::int`,
        average: sql<number>`COUNT(*) FILTER (WHERE ${result.stateAverageRecord} = 'SR')::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          memberYearFilter,
          or(
            eq(result.stateSingleRecord, "SR"),
            eq(result.stateAverageRecord, "SR"),
          ),
        ),
      )
      .groupBy(result.eventId, event.name, event.rank)
      .orderBy(
        desc(
          sql`(COUNT(*) FILTER (WHERE ${result.stateSingleRecord} = 'SR') + COUNT(*) FILTER (WHERE ${result.stateAverageRecord} = 'SR'))`,
        ),
        asc(event.rank),
      ),

    // Record totals
    db
      .select({
        wr: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'WR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'WR' THEN 1 ELSE 0 END))::int`,
        nar: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NAR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NAR' THEN 1 ELSE 0 END))::int`,
        nr: sql<number>`SUM((CASE WHEN ${result.regionalSingleRecord} = 'NR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.regionalAverageRecord} = 'NR' THEN 1 ELSE 0 END))::int`,
        sr: sql<number>`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter)
      .then((rows) => rows[0]),

    // Top SR breakers
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        count: sql<number>`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          memberYearFilter,
          or(
            eq(result.stateSingleRecord, "SR"),
            eq(result.stateAverageRecord, "SR"),
          ),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .orderBy(
        desc(
          sql`SUM((CASE WHEN ${result.stateSingleRecord} = 'SR' THEN 1 ELSE 0 END) + (CASE WHEN ${result.stateAverageRecord} = 'SR' THEN 1 ELSE 0 END))`,
        ),
        asc(person.name),
      )
      .limit(TOP_N),

    // Regional records (WR/NAR/NR) detail rows
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        eventId: result.eventId,
        eventName: event.name,
        regionalSingleRecord: result.regionalSingleRecord,
        regionalAverageRecord: result.regionalAverageRecord,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .where(
        and(
          memberYearFilter,
          or(
            inArray(result.regionalSingleRecord, ["WR", "NAR", "NR"]),
            inArray(result.regionalAverageRecord, ["WR", "NAR", "NR"]),
          ),
        ),
      )
      .orderBy(asc(event.rank), asc(person.name)),

    // Championship final results for team members
    db
      .select({
        resultId: result.id,
        wcaId: person.wcaId,
        name: person.name,
        eventId: result.eventId,
        eventName: event.name,
        competitionId: result.competitionId,
        competitionName: competition.name,
        championshipType: championship.championshipType,
        pos: result.pos,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .innerJoin(event, eq(result.eventId, event.id))
      .innerJoin(championship, eq(championship.competitionId, competition.id))
      .where(
        and(
          memberYearFilter,
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          inArray(championship.championshipType, [
            ...FEATURED_CHAMPIONSHIP_TYPES,
          ]),
        ),
      )
      .orderBy(desc(competition.startDate), asc(event.rank)),

    // First podium year per team member (for first-time podiumers)
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        firstPodiumYear: sql<number>`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(
        and(
          eq(person.stateId, stateId),
          inArray(result.roundTypeId, ["f", "c"]),
          inArray(result.pos, [1, 2, 3]),
          gt(result.best, 0),
        ),
      )
      .groupBy(person.wcaId, person.name)
      .having(
        sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
      )
      .orderBy(asc(person.name)),

    // Roster debuts: members whose first-ever WCA year is this year
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(eq(person.stateId, stateId))
      .groupBy(person.wcaId, person.name)
      .having(
        sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
      )
      .orderBy(asc(person.name)),

    // First time competing away from home state
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(and(eq(person.stateId, stateId), awayLocationFilter))
      .groupBy(person.wcaId, person.name)
      .having(
        sql`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int = ${year}`,
      )
      .orderBy(asc(person.name)),

    // Previous year season (for YoY)
    includePrevYear
      ? db
          .select({
            activeMembers: countDistinct(result.personId),
          })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .innerJoin(person, eq(result.personId, person.wcaId))
          .where(prevMemberYearFilter)
          .then((rows) => rows[0])
      : Promise.resolve({ activeMembers: 0 }),

    includePrevYear
      ? db
          .select({
            competitionCount: countDistinct(competition.id),
          })
          .from(competition)
          .where(prevHostedYearFilter)
          .then((rows) => rows[0])
      : Promise.resolve({ competitionCount: 0 }),

    includePrevYear
      ? db
          .select({
            gold: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 1)::int`,
            silver: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 2)::int`,
            bronze: sql<number>`COUNT(*) FILTER (WHERE ${result.pos} = 3)::int`,
          })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .innerJoin(person, eq(result.personId, person.wcaId))
          .where(
            and(
              prevMemberYearFilter,
              inArray(result.roundTypeId, ["f", "c"]),
              inArray(result.pos, [1, 2, 3]),
              gt(result.best, 0),
            ),
          )
          .then((rows) => rows[0])
      : Promise.resolve({ gold: 0, silver: 0, bronze: 0 }),

    // Prev-year active member ids (retention)
    includePrevYear
      ? db
          .selectDistinct({ wcaId: person.wcaId })
          .from(result)
          .innerJoin(competition, eq(result.competitionId, competition.id))
          .innerJoin(person, eq(result.personId, person.wcaId))
          .where(prevMemberYearFilter)
      : Promise.resolve([] as { wcaId: string }[]),

    // This-year active member ids (retention)
    db
      .selectDistinct({ wcaId: person.wcaId })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .innerJoin(person, eq(result.personId, person.wcaId))
      .where(memberYearFilter),

    // Full roster for team Kinch/SoR (current membership)
    db
      .select({ wcaId: person.wcaId })
      .from(person)
      .where(eq(person.stateId, stateId)),

    // Delegate candidates for new-delegate heuristic
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gender: person.gender,
        level: delegate.level,
        competitionId: competition.id,
        competitionName: competition.name,
        startDate: competition.startDate,
      })
      .from(delegate)
      .innerJoin(person, eq(delegate.personId, person.wcaId))
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .innerJoin(
        competition,
        eq(competitionDelegate.competitionId, competition.id),
      )
      .where(eq(person.stateId, stateId))
      .orderBy(asc(competition.startDate), asc(person.name)),

    // Team organizers of hosted comps
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(competition.id),
      })
      .from(organizer)
      .innerJoin(person, eq(organizer.personId, person.wcaId))
      .innerJoin(
        competitionOrganizer,
        eq(competitionOrganizer.organizerId, organizer.id),
      )
      .innerJoin(
        competition,
        eq(competitionOrganizer.competitionId, competition.id),
      )
      .where(and(hostedYearFilter, eq(person.stateId, stateId)))
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(competition.id)), asc(person.name)),

    // Team delegates of hosted comps
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(competition.id),
      })
      .from(delegate)
      .innerJoin(person, eq(delegate.personId, person.wcaId))
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .innerJoin(
        competition,
        eq(competitionDelegate.competitionId, competition.id),
      )
      .where(and(hostedYearFilter, eq(person.stateId, stateId)))
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(competition.id)), asc(person.name)),
  ]);

  // Crossed teams: other Mexican states met at comps where team members competed
  const memberComps = db
    .$with("member_comps")
    .as(
      db
        .selectDistinct({ competitionId: result.competitionId })
        .from(result)
        .innerJoin(competition, eq(result.competitionId, competition.id))
        .innerJoin(person, eq(result.personId, person.wcaId))
        .where(memberYearFilter),
    );

  const crossedTeamRows = await db
    .with(memberComps)
    .select({
      stateId: person.stateId,
      teamName: team.name,
      teamImage: team.image,
      sharedCompetitions: countDistinct(result.competitionId),
      competitorsMet: countDistinct(person.wcaId),
    })
    .from(result)
    .innerJoin(memberComps, eq(result.competitionId, memberComps.competitionId))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .innerJoin(team, eq(person.stateId, team.stateId))
    .where(and(isNotNull(person.stateId), ne(person.stateId, stateId)))
    .groupBy(person.stateId, team.name, team.image)
    .orderBy(
      desc(countDistinct(result.competitionId)),
      desc(countDistinct(person.wcaId)),
      asc(team.name),
    )
    .limit(TOP_N);

  const mostDiverseCompRows = await db
    .with(memberComps)
    .select({
      competitionId: competition.id,
      competitionName: competition.name,
      distinctTeams: countDistinct(person.stateId),
    })
    .from(result)
    .innerJoin(memberComps, eq(result.competitionId, memberComps.competitionId))
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(and(isNotNull(person.stateId), ne(person.stateId, stateId)))
    .groupBy(competition.id, competition.name)
    .orderBy(desc(countDistinct(person.stateId)), asc(competition.name))
    .limit(1);

  // Newcomers: team members whose first-ever competition is in this year
  // and who competed in a hosted competition this year.
  const newcomerRows = await db
    .select({
      wcaId: person.wcaId,
    })
    .from(result)
    .innerJoin(competition, eq(result.competitionId, competition.id))
    .innerJoin(person, eq(result.personId, person.wcaId))
    .where(and(hostedYearFilter, eq(person.stateId, stateId)))
    .groupBy(person.wcaId);

  const newcomerWcaIds = newcomerRows.map((r) => r.wcaId);
  let newcomers = 0;
  if (newcomerWcaIds.length > 0) {
    const firstCompRows = await db
      .select({
        wcaId: result.personId,
        firstYear: sql<number>`EXTRACT(YEAR FROM MIN(${competition.startDate}) AT TIME ZONE 'UTC')::int`,
      })
      .from(result)
      .innerJoin(competition, eq(result.competitionId, competition.id))
      .where(inArray(result.personId, newcomerWcaIds))
      .groupBy(result.personId);

    newcomers = firstCompRows.filter(
      (r) => Number(r.firstYear) === year,
    ).length;
  }

  // Championship podium processing (MX position reassignment)
  const mxCompetitionIds = [
    ...new Set(
      championshipRows
        .filter((row) => row.championshipType === "MX")
        .map((row) => row.competitionId),
    ),
  ];

  const mxChampionshipPosByResultId = new Map<string, number>();

  if (mxCompetitionIds.length > 0) {
    const peers = await db
      .select({
        resultId: result.id,
        competitionId: result.competitionId,
        eventId: result.eventId,
        roundTypeId: result.roundTypeId,
        pos: result.pos,
      })
      .from(result)
      .innerJoin(
        championship,
        eq(championship.competitionId, result.competitionId),
      )
      .where(
        and(
          inArray(result.competitionId, mxCompetitionIds),
          inArray(result.roundTypeId, ["f", "c"]),
          gt(result.best, 0),
          eq(championship.championshipType, "MX"),
        ),
      );

    const groups = new Map<string, typeof peers>();
    for (const peer of peers) {
      const key = `${peer.competitionId}|${peer.eventId}|${peer.roundTypeId}`;
      const group = groups.get(key) ?? [];
      group.push(peer);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      for (const ranked of assignChampionshipPositions(group)) {
        mxChampionshipPosByResultId.set(
          ranked.resultId,
          ranked.championshipPosition,
        );
      }
    }
  }

  const championshipPodiumRows: TeamSummaryChampionshipPodium[] = [];
  for (const row of championshipRows) {
    let position: number | null = row.pos;
    if (row.championshipType === "MX") {
      position = mxChampionshipPosByResultId.get(row.resultId) ?? null;
    }
    if (position === null || position < 1 || position > 3) continue;

    championshipPodiumRows.push({
      wcaId: row.wcaId,
      name: row.name,
      eventId: row.eventId,
      eventName: row.eventName,
      championshipType: row.championshipType,
      competitionName: row.competitionName,
      position,
    });
  }

  // New delegates: first competition_delegates appearance in this year
  const firstDelegateByPerson = new Map<
    string,
    (typeof newDelegateCandidates)[number]
  >();
  for (const row of newDelegateCandidates) {
    if (!firstDelegateByPerson.has(row.wcaId)) {
      firstDelegateByPerson.set(row.wcaId, row);
    }
  }
  const newDelegates: TeamSummaryNewDelegate[] = Array.from(
    firstDelegateByPerson.values(),
  )
    .filter((row) => {
      const startMs = new Date(row.startDate).getTime();
      return startMs >= yearStart.getTime() && startMs < yearEnd.getTime();
    })
    .map((row) => ({
      wcaId: row.wcaId,
      name: row.name,
      level: (row.level as DelegateLevel | null) ?? null,
      gender: row.gender,
      firstCompetitionId: row.competitionId,
      firstCompetitionName: row.competitionName,
      firstCompetitionDate: String(row.startDate),
    }))
    .sort((a, b) => (a.name ?? a.wcaId).localeCompare(b.name ?? b.wcaId, "es"));

  // Regional records flattened
  const regionalRecords: TeamSummaryRegionalRecord[] = [];
  for (const row of regionalRecordRows) {
    if (
      row.regionalSingleRecord === "WR" ||
      row.regionalSingleRecord === "NAR" ||
      row.regionalSingleRecord === "NR"
    ) {
      regionalRecords.push({
        wcaId: row.wcaId,
        name: row.name,
        eventId: row.eventId,
        eventName: row.eventName,
        type: row.regionalSingleRecord,
        resultType: "single",
      });
    }
    if (
      row.regionalAverageRecord === "WR" ||
      row.regionalAverageRecord === "NAR" ||
      row.regionalAverageRecord === "NR"
    ) {
      regionalRecords.push({
        wcaId: row.wcaId,
        name: row.name,
        eventId: row.eventId,
        eventName: row.eventName,
        type: row.regionalAverageRecord,
        resultType: "average",
      });
    }
  }

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
