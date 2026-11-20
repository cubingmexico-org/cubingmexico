import { REGIONAL_RECORD_MARKERS } from "@/lib/mark-state-records";
import type { EnrichedLiveCompetitor, LiveResult } from "./types";

const REGIONAL_SET = new Set<string>(REGIONAL_RECORD_MARKERS);

export type StateBestMap = Map<string, number>;

export type LiveResultRecordTags = {
  single_record_tag: string | null;
  average_record_tag: string | null;
  stateSingleRecord: string | null;
  stateAverageRecord: string | null;
};

function isRegionalTag(tag: string | null | undefined): boolean {
  if (tag == null) return false;
  return REGIONAL_SET.has(tag.trim());
}

/**
 * Whether `value` ties or beats the current state best (WCA encoding: lower is
 * better for both normal events and 333mbf ranks). Invalid/DNF/DNS never SR.
 */
export function beatsOrTiesStateBest(
  value: number,
  currentBest: number | null | undefined,
): boolean {
  if (value <= 0) return false;
  if (currentBest == null) return true;
  return value <= currentBest;
}

export function liveStateRecordTag(
  value: number,
  wcaRegionalTag: string | null | undefined,
  currentBest: number | null | undefined,
): "SR" | null {
  if (isRegionalTag(wcaRegionalTag)) return null;
  if (!beatsOrTiesStateBest(value, currentBest)) return null;
  return "SR";
}

export function attachLiveStateRecords(
  results: LiveResult[],
  competitorsByRegistrationId: Map<number, EnrichedLiveCompetitor>,
  singleBests: StateBestMap,
  averageBests: StateBestMap,
): LiveResultRecordTags[] {
  return results.map((result) => {
    const competitor = competitorsByRegistrationId.get(result.registration_id);
    const stateId = competitor?.stateId ?? null;

    const singleBest = stateId ? singleBests.get(stateId) : undefined;
    const averageBest = stateId ? averageBests.get(stateId) : undefined;

    return {
      single_record_tag: result.single_record_tag,
      average_record_tag: result.average_record_tag,
      stateSingleRecord: stateId
        ? liveStateRecordTag(result.best, result.single_record_tag, singleBest)
        : null,
      stateAverageRecord: stateId
        ? liveStateRecordTag(
            result.average,
            result.average_record_tag,
            averageBest,
          )
        : null,
    };
  });
}
