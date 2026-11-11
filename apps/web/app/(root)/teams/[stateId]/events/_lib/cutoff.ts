/** Share of members whose typical result should beat the suggested cutoff. */
export const CUTOFF_MEMBER_PERCENTILE = 0.75;
/** Members whose typical result is at most this fraction above the cutoff count as close. */
export const CUTOFF_CLOSE_MARGIN = 0.1;
/** Below this many members with results, the percentile is too noisy to suggest a cutoff. */
export const MIN_MEMBERS_FOR_CUTOFF = 5;
/** Below this many rounds with a cutoff in Mexico, there is no typical cutoff to cap at. */
export const MIN_ROUNDS_FOR_TYPICAL_CUTOFF = 5;

export type CutoffRecommendation = {
  /** Centiseconds; a result must be strictly below it to make the cutoff. */
  cutoff: number;
  members: number;
  passing: number;
  close: number;
  /** The team's cutoff was above the typical cutoff in Mexico and was lowered to it. */
  capped: boolean;
};

/** Best of the first attempts among competitors who made a round's cutoff and among those who didn't. */
export type CutoffRound = {
  slowestMade: number | null;
  fastestMissed: number | null;
};

/** Attempts a competitor gets to make the cutoff: 2 in Ao5 rounds, 1 in Mo3 rounds. */
export function cutoffAttempts(formatId: string): number {
  return formatId === "a" ? 2 : 1;
}

function cutoffStep(centiseconds: number): number {
  if (centiseconds < 30 * 100) return 100;
  if (centiseconds < 2 * 60 * 100) return 5 * 100;
  if (centiseconds < 5 * 60 * 100) return 15 * 100;
  return 30 * 100;
}

/** Next round value strictly above `centiseconds`, so a result equal to it still makes the cutoff. */
export function roundUpCutoff(centiseconds: number): number {
  const step = cutoffStep(centiseconds);
  return (Math.floor(centiseconds / step) + 1) * step;
}

/** Misses are `Infinity`, so a member with mostly misses has an `Infinity` median. */
export function median(values: number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** From roundest to least round, in centiseconds. */
const ROUND_CUTOFF_STEPS = [6000, 3000, 1500, 1000, 500, 100];

/**
 * A round's cutoff lies above its slowest made result and at or below its
 * fastest missed one. Organizers pick round values, so the estimate is the
 * roundest value in that range.
 */
export function estimateRoundCutoff(
  slowestMade: number,
  fastestMissed: number,
): number {
  for (const step of ROUND_CUTOFF_STEPS) {
    const candidate = (Math.floor(slowestMade / step) + 1) * step;
    if (candidate <= fastestMissed) return candidate;
  }
  return fastestMissed;
}

/** Median of the estimated cutoffs of rounds with a cutoff. */
export function typicalCutoff(rounds: CutoffRound[]): number | null {
  const estimates: number[] = [];
  for (const { slowestMade, fastestMissed } of rounds) {
    if (slowestMade === null || fastestMissed === null) continue;
    if (slowestMade >= fastestMissed) continue;
    estimates.push(estimateRoundCutoff(slowestMade, fastestMissed));
  }
  if (estimates.length < MIN_ROUNDS_FOR_TYPICAL_CUTOFF) return null;
  estimates.sort((a, b) => a - b);
  return estimates[Math.ceil(estimates.length / 2) - 1]!;
}

/**
 * `memberMedians` holds each member's median best-of-first-attempts, `Infinity`
 * for misses. `cap` keeps slow events within cutoffs competitions actually use.
 */
export function recommendCutoff(
  memberMedians: number[],
  cap: number | null = null,
): CutoffRecommendation | null {
  const members = memberMedians.length;
  if (members < MIN_MEMBERS_FOR_CUTOFF) return null;

  const sorted = memberMedians.slice().sort((a, b) => a - b);
  const index = Math.ceil(CUTOFF_MEMBER_PERCENTILE * members) - 1;
  const target = sorted[index]!;
  if (!Number.isFinite(target)) return null;

  const teamCutoff = roundUpCutoff(target);
  const capped = cap !== null && cap < teamCutoff;
  const cutoff = capped ? cap : teamCutoff;
  const closeLimit = cutoff * (1 + CUTOFF_CLOSE_MARGIN);
  let passing = 0;
  let close = 0;
  for (const value of memberMedians) {
    if (value < cutoff) passing++;
    else if (value <= closeLimit) close++;
  }

  return { cutoff, members, passing, close, capped };
}
