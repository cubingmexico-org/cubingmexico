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
