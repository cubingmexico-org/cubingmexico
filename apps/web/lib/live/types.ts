export type ScoretakingSoftware = "external" | "wca_live" | "internal";

export type LiveCompetitionMeta = {
  id: string;
  name: string;
  scoretakingSoftware: ScoretakingSoftware | null;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  venue: string | null;
};

export type LiveRoundState = "open" | "locked" | string;

export type LiveRoundSummary = {
  id: string;
  format: string;
  state: LiveRoundState;
  timeLimit?: {
    centiseconds: number;
    cumulativeRoundIds: string[];
  } | null;
  cutoff?: {
    numberOfAttempts: number;
    resultValue: number;
  } | null;
  total_competitors?: number | null;
  completed_competitors?: number | null;
  min_competitors_to_open?: number | null;
};

export type LiveRoundsResponse = {
  rounds: LiveRoundSummary[];
};

export type LiveCompetitor = {
  id: number;
  user_id: number;
  registrant_id: number;
  name: string;
  country_iso2: string;
  wca_id: string | null;
};

export type LiveAttempt = {
  attempt_number: number;
  value: number;
};

export type LiveResult = {
  global_pos: number | null;
  local_pos: number | null;
  registration_id: number;
  best: number;
  average: number;
  single_record_tag: string | null;
  average_record_tag: string | null;
  advancing: boolean;
  advancing_questionable: boolean;
  last_attempt_entered_at: string | null;
  event_id: string;
  attempts: LiveAttempt[];
  result_id: number;
  round_wcif_id: string;
};

/** Live result plus Cubing México state-record tags computed at enrich time. */
export type EnrichedLiveResult = LiveResult & {
  stateSingleRecord: string | null;
  stateAverageRecord: string | null;
};

export type LiveRoundDetails = LiveRoundSummary & {
  round_id: number;
  competitors: LiveCompetitor[];
  results: LiveResult[];
  state_hash?: string;
};

export type PersonStateEnrichment = {
  stateId: string | null;
  stateName: string | null;
};

export type EnrichedLiveCompetitor = LiveCompetitor & PersonStateEnrichment;

export type EnrichedLiveRoundDetails = Omit<
  LiveRoundDetails,
  "competitors" | "results"
> & {
  competitors: EnrichedLiveCompetitor[];
  results: EnrichedLiveResult[];
  scoretakingSoftware: ScoretakingSoftware | null;
  competitionName: string | null;
};
