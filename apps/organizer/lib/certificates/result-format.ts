import type { Result, Round } from "@/types/wcif";

const BEST_OF_FORMATS = new Set(["1", "2", "3", "5"]);

/** Best-of rounds are ranked by single; Ao5 and Mo3 rounds by average. */
export function ranksBySingle(round: Pick<Round, "format">): boolean {
  return BEST_OF_FORMATS.has(round.format);
}

/** The value a round ranks a result by. */
export function rankingValue(
  round: Pick<Round, "format">,
  result: Pick<Result, "best" | "average">,
): number {
  return ranksBySingle(round) ? result.best : result.average;
}
