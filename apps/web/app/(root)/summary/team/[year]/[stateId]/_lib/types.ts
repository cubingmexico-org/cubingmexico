import type { DelegateLevel } from "@/lib/delegate-level";

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
