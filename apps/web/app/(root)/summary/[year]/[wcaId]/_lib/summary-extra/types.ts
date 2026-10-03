import "server-only";

import type { Tier } from "@/types";

export type SharedCuber = {
  wcaId: string;
  name: string | null;
  sharedCompetitions: number;
};

export type StateVisits = {
  stateId: string;
  stateName: string;
  times: number;
};

export type RecordByEvent = {
  eventId: string;
  eventName: string;
  eventRank: number;
  single: number;
  average: number;
};

export type YearRecords = {
  wr: number;
  nar: number;
  nr: number;
  sr: number;
  byEventSr: RecordByEvent[];
};

export type ChampionshipPodiumRow = {
  eventId: string;
  eventName: string;
  championshipType: string;
  competitionName: string;
  position: number;
};

export type YearChampionshipPodiums = {
  total: number;
  mx: number;
  nac: number;
  world: number;
  rows: ChampionshipPodiumRow[];
};

export type StaffCompetition = {
  id: string;
  name: string;
  startDate: string;
  cityName: string;
  stateName: string | null;
};

export type YearStaff = {
  organized: StaffCompetition[];
  delegated: StaffCompetition[];
};

export type PrStreakCompetition = {
  competitionId: string;
  competitionName: string;
  startDate: string;
};

export type YearPrStreak = {
  length: number;
  competitions: PrStreakCompetition[];
} | null;

export type YearStates = {
  visits: StateVisits[];
  firstTime: StateVisits[];
};

export type RankProgressRow = {
  eventId: string;
  eventName: string;
  eventRank: number;
  type: "single" | "average";
  nrBefore: number | null;
  nrAfter: number | null;
  srBefore: number | null;
  srAfter: number | null;
};

export type MollerzConditions = {
  numberOfSpeedsolvingAverages: number;
  numberOfBLDFMCMeans: number;
  hasWorldRecord: boolean;
  hasWorldChampionshipPodium: boolean;
  eventsWon: number;
};

export type YearMollerz = {
  tierBefore: Tier | null;
  tierAfter: Tier | null;
  conditionsBefore: MollerzConditions | null;
  conditionsAfter: MollerzConditions;
} | null;

export type YearKinchSor = {
  kinchBefore: number;
  kinchAfter: number;
  sorSingleBefore: number;
  sorSingleAfter: number;
  sorAverageBefore: number;
  sorAverageAfter: number;
};
