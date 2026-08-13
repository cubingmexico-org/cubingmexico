import { isBefore, subMonths } from "date-fns";
import type { Competition } from "@/types/wca";

/**
 * Certificates/badges stay available until ~1 month after results are posted.
 * If results are not posted yet, the competition remains available (once announced).
 */
export function isCompetitionToolsUnavailable(
  competition: Pick<Competition, "announced_at" | "results_posted_at">,
  now: Date = new Date(),
): boolean {
  if (competition.announced_at === null) {
    return true;
  }

  if (!competition.results_posted_at) {
    return false;
  }

  return isBefore(new Date(competition.results_posted_at), subMonths(now, 1));
}
