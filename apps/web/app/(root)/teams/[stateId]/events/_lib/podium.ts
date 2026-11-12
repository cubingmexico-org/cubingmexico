/** Below this many finals, the typical podium results are too noisy to show. */
export const MIN_FINALS_FOR_PODIUM_LEVEL = 2;

export type PodiumFinal = {
  first: number | null;
  third: number | null;
};

export type PodiumLevel = {
  finals: number;
  /** Typical first-place result. */
  first: number;
  /** Typical third-place result, the usual bar to make the podium; null if no final had a valid one. */
  third: number | null;
};

/** Ao5 and Mo3 rounds rank by average, the rest by single. */
export function isAverageFormat(formatId: string): boolean {
  return formatId === "a" || formatId === "m";
}

/** The value a round is ranked by; null for DNF, DNS or missing results. */
export function rankingValue(
  formatId: string,
  best: number,
  average: number,
): number | null {
  const value = isAverageFormat(formatId) ? average : best;
  return value > 0 ? value : null;
}

/**
 * Lower-middle element, so the median is always an actual result. Encoded
 * values like Multi-Blind's can't be averaged.
 */
export function discreteMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length / 2) - 1]!;
}

/**
 * First and third place of one final from its rows with `pos <= 3`. Ties can
 * leave no third place (1, 2, 2), in which case the slowest podium result is
 * the bar.
 */
export function finalPodium(
  rows: { pos: number; value: number | null }[],
): PodiumFinal {
  const valid = rows.flatMap((r) =>
    r.value === null || r.pos < 1 || r.pos > 3
      ? []
      : [{ pos: r.pos, value: r.value }],
  );
  const atPos = (pos: number) => {
    const values = valid.filter((r) => r.pos === pos).map((r) => r.value);
    return values.length > 0 ? Math.min(...values) : null;
  };
  const third =
    atPos(3) ??
    (valid.length >= 3 ? Math.max(...valid.map((r) => r.value)) : null);
  return { first: atPos(1), third };
}

export function podiumLevel(finals: PodiumFinal[]): PodiumLevel | null {
  const firsts = finals.flatMap((f) => (f.first === null ? [] : [f.first]));
  if (firsts.length < MIN_FINALS_FOR_PODIUM_LEVEL) return null;
  const thirds = finals.flatMap((f) => (f.third === null ? [] : [f.third]));
  return {
    finals: firsts.length,
    first: discreteMedian(firsts)!,
    third: discreteMedian(thirds),
  };
}

/** Members whose PR beats the typical third place; results are lower-is-better. */
export function membersAtLevel(prs: number[], third: number | null): number {
  if (third === null) return 0;
  return prs.filter((pr) => pr > 0 && pr < third).length;
}
