import type { CcCompetitor, CcEventFormat } from "@/lib/cubing-contests";
import { normalizeSearchText } from "@/lib/search";

export type CcRankType = "single" | "average";

/** Best result of one competitor, or one team for team events. */
export interface CcRankingRow {
  /** Sorted Cubing Contests person ids, joined with "-". */
  key: string;
  countryRank: number;
  /** Rank among the rows that pass the state filter; null without one. */
  stateRank: number | null;
  value: number;
  resultId: number;
  competitionId: string;
  competitionName: string;
  date: Date;
  competitors: CcCompetitor[];
}

export interface CcRankingFilters {
  page: number;
  perPage: number;
  name: string;
  state: string[];
}

export function rowStates(row: Pick<CcRankingRow, "competitors">): string[] {
  return Array.from(
    new Set(
      row.competitors
        .map((competitor) => competitor.stateName)
        .filter((name): name is string => name !== null),
    ),
  );
}

/** Competition ranking (1, 1, 3) over rows already sorted by value. */
function assignCompetitionRanks<T extends { value: number }>(
  rows: T[],
): (T & { rank: number })[] {
  const ranked: (T & { rank: number })[] = [];
  rows.forEach((row, index) => {
    const previous = ranked[index - 1];
    const rank =
      previous && previous.value === row.value ? previous.rank : index + 1;
    ranked.push({ ...row, rank });
  });
  return ranked;
}

/**
 * Filters by competitor name and state (a team matches when any member does),
 * ranks within the state filter, and returns one page.
 */
export function filterCcRanking(
  rows: CcRankingRow[],
  input: CcRankingFilters,
): { data: CcRankingRow[]; pageCount: number } {
  const query = normalizeSearchText(input.name.trim());
  const states = new Set(input.state);

  const filtered = rows.filter((row) => {
    if (
      query &&
      !row.competitors.some((competitor) =>
        normalizeSearchText(competitor.name).includes(query),
      )
    ) {
      return false;
    }
    if (states.size > 0 && !rowStates(row).some((name) => states.has(name))) {
      return false;
    }
    return true;
  });

  const withStateRank =
    states.size > 0
      ? (() => {
          const stateRows = rows.filter((row) =>
            rowStates(row).some((name) => states.has(name)),
          );
          const ranks = new Map(
            assignCompetitionRanks(stateRows).map((row) => [row.key, row.rank]),
          );
          return filtered.map((row) => ({
            ...row,
            stateRank: ranks.get(row.key) ?? null,
          }));
        })()
      : filtered.map((row) => ({ ...row, stateRank: null }));

  const perPage = Math.max(1, input.perPage);
  const page = Math.max(1, input.page);
  return {
    data: withStateRank.slice((page - 1) * perPage, page * perPage),
    pageCount: Math.ceil(withStateRank.length / perPage),
  };
}

/** Number of ranked rows per state, for the state filter options. */
export function countCcRankingStates(
  rows: CcRankingRow[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const name of rowStates(row)) {
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b, "es")),
  );
}

export interface CcRecordRow extends Omit<CcRankingRow, "stateRank"> {
  eventId: string;
  eventName: string;
  eventFormat: CcEventFormat;
  type: CcRankType;
}

/** Every row tied for the best value, optionally among one state's rows. */
export function pickCcRecords(
  rows: CcRankingRow[],
  stateName: string,
): CcRankingRow[] {
  const candidates = stateName
    ? rows.filter((row) => rowStates(row).includes(stateName))
    : rows;
  const best = candidates[0]?.value;
  if (best === undefined) return [];
  return candidates.filter((row) => row.value === best);
}
