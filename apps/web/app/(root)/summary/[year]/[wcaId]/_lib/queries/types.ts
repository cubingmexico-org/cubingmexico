import "server-only";

import type {
  RankProgressRow,
  SharedCuber,
  YearChampionshipPodiums,
  YearKinchSor,
  YearMollerz,
  YearPrStreak,
  YearRecords,
  YearStaff,
  YearStates,
} from "../summary-extra";

export type AnnualSummaryPerson = {
  wcaId: string;
  name: string | null;
  gender: "m" | "f" | "o" | null;
  stateId: string | null;
};

export type PodiumByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  gold: number;
  silver: number;
  bronze: number;
};

export type SolvesByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  solves: number;
  attempts: number;
};

export type PrBreaksByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  times: number;
  single: number;
  average: number;
};

export type PrImprovement = {
  eventId: string;
  eventName: string;
  eventRank: number;
  before: number | null;
  during: number;
  improvement: number | null;
  improvementPercent: number | null;
};

export type SharedCompetitionBucket = {
  sharedCompetitions: number;
  competitors: number;
};

export type YearPodiums = {
  total: number;
  events: number;
  gold: number;
  silver: number;
  bronze: number;
  byEvent: PodiumByEvent[];
};

export type YearSolves = {
  totalSolves: number;
  totalAttempts: number;
  byEvent: SolvesByEvent[];
};

export type YearPersonalBests = {
  totalBreaks: number;
  events: number;
  singleBreaks: number;
  averageBreaks: number;
  byEvent: PrBreaksByEvent[];
  singleImprovements: PrImprovement[];
  averageImprovements: PrImprovement[];
};

export type AnnualSummary = {
  person: AnnualSummaryPerson;
  year: number;
  availableYears: number[];
  competitionCount: number;
  roundCount: number;
  eventCount: number;
  firstCompetitionDate: string;
  lastCompetitionDate: string;
  podiums: YearPodiums;
  records: YearRecords;
  championshipPodiums: YearChampionshipPodiums;
  prStreak: YearPrStreak;
  solves: YearSolves;
  personalBests: YearPersonalBests;
  cubers: {
    total: number;
    repeated: number;
    topShared: SharedCuber[];
    distribution: SharedCompetitionBucket[];
    teammates: SharedCuber[];
  };
  states: YearStates;
  travelKm: number | null;
  rankProgress: RankProgressRow[];
  kinchSor: YearKinchSor;
  mollerz: YearMollerz;
  staff: YearStaff;
};
