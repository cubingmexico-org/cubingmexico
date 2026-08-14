/**
 * Station → group / staff count formulas inspired by Groupifier.
 * Reimplemented; not copied from Groupifier source.
 */

export function preferredGroupSize(stations: number): number {
  return stations * 1.7;
}

export function suggestedGroupCount(params: {
  competitors: number;
  stations: number;
  roundNumber: number;
}): number {
  const { competitors, stations, roundNumber } = params;
  const minGroups = roundNumber === 1 ? 2 : 1;
  if (stations <= 0) {
    return Math.max(minGroups, 1);
  }
  const size = preferredGroupSize(stations);
  const raw = Math.round(competitors / size + 0.4);
  return Math.max(minGroups, raw);
}

/** Stations actually filled for a group (cannot exceed competitors). */
export function stationsInUse(
  stations: number,
  groupCompetitors: number,
): number {
  if (stations <= 0) return Math.max(groupCompetitors, 0);
  return Math.min(stations, Math.max(groupCompetitors, 0));
}

export function suggestedScramblers(stationsUsed: number): number {
  if (stationsUsed <= 0) return 0;
  return Math.floor(1 + (stationsUsed - 1) / 5);
}

export function suggestedRunners(stationsUsed: number): number {
  if (stationsUsed <= 0) return 0;
  return Math.floor(1 + (stationsUsed - 1) / 8);
}

export function suggestedJudges(
  stations: number,
  groupCompetitors: number,
  assignJudges: boolean,
): number {
  if (!assignJudges || stations <= 0) return 0;
  return Math.min(stations, Math.max(groupCompetitors, 0));
}

export type StaffSuggestion = {
  groups: number;
  peoplePerGroup: number;
  stationsInUse: number;
  scramblers: number;
  runners: number;
  judges: number;
  cubesPerScrambler: number;
  stationsPerRunner: number;
};

/** Suggest groups and staff counts for a round (Groupifier-style helpers). */
export function suggestStaffForRound(params: {
  stations: number;
  competitors: number;
  roundNumber: number;
  groups?: number;
  assignScramblers?: boolean;
  assignRunners?: boolean;
  assignJudges?: boolean;
}): StaffSuggestion {
  const groups =
    params.groups ??
    suggestedGroupCount({
      competitors: params.competitors,
      stations: params.stations,
      roundNumber: params.roundNumber,
    });
  const peoplePerGroup = Math.ceil(params.competitors / Math.max(groups, 1));
  const stationsUsed = stationsInUse(params.stations, peoplePerGroup);
  const assignScramblers = params.assignScramblers !== false;
  const assignRunners = params.assignRunners !== false;
  const assignJudges = params.assignJudges !== false && params.stations > 0;
  const scramblers = assignScramblers ? suggestedScramblers(stationsUsed) : 0;
  const runners = assignRunners ? suggestedRunners(stationsUsed) : 0;
  const judges = suggestedJudges(params.stations, peoplePerGroup, assignJudges);

  return {
    groups,
    peoplePerGroup,
    stationsInUse: stationsUsed,
    scramblers,
    runners,
    judges,
    cubesPerScrambler:
      scramblers > 0 ? Math.round((stationsUsed / scramblers) * 10) / 10 : 0,
    stationsPerRunner:
      runners > 0 ? Math.round((stationsUsed / runners) * 10) / 10 : 0,
  };
}
