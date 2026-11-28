export type CommunitySummaryPerson = {
  wcaId: string;
  name: string | null;
};

export type CommunitySummaryCompetitorCount = CommunitySummaryPerson & {
  competitions: number;
};

export type CommunitySummaryPodiumer = CommunitySummaryPerson & {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
};

export type CommunitySummaryRecordHolder = CommunitySummaryPerson & {
  count: number;
};

export type CommunitySummaryRegionalRecord = CommunitySummaryPerson & {
  eventId: string;
  eventName: string;
  type: "WR" | "NAR" | "NR";
  resultType: "single" | "average";
};

export type CommunitySummaryEventRecords = {
  eventId: string;
  eventName: string;
  eventRank: number;
  single: number;
  average: number;
};

export type CommunitySummaryTravelState = {
  stateId: string;
  stateName: string;
  competitors: number;
  competitions: number;
};

export type CommunitySummaryBiggestTurnout = {
  competitionId: string;
  competitionName: string;
  memberCount: number;
};

export type CommunitySummarySeason = {
  activeMembers: number;
  competitionCount: number;
  eventCount: number;
  roundCount: number;
  firstCompetitionDate: string | null;
  lastCompetitionDate: string | null;
};

export type CommunitySummaryDominantEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  total: number;
  gold: number;
  silver: number;
  bronze: number;
};

export type CommunityAnnualSummary = {
  community: {
    id: string;
    name: string;
    image: string | null;
    regionLabel: string | null;
  };
  year: number;
  availableYears: number[];
  season: CommunitySummarySeason;
  biggestTurnout: CommunitySummaryBiggestTurnout | null;
  mostActive: CommunitySummaryCompetitorCount[];
  debuts: number;
  dominantEvents: CommunitySummaryDominantEvent[];
  foreign: {
    competitorCount: number;
    competitionCount: number;
    topTravelers: CommunitySummaryCompetitorCount[];
  };
  visitedStates: {
    competitorCount: number;
    byState: CommunitySummaryTravelState[];
  };
  podiums: {
    total: number;
    gold: number;
    silver: number;
    bronze: number;
    topPodiumers: CommunitySummaryPodiumer[];
    firstTimePodiumers: CommunitySummaryPerson[];
  };
  records: {
    sr: number;
    nr: number;
    nar: number;
    wr: number;
    byEventSr: CommunitySummaryEventRecords[];
    topSrBreakers: CommunitySummaryRecordHolder[];
    regionalRecords: CommunitySummaryRegionalRecord[];
  };
};
