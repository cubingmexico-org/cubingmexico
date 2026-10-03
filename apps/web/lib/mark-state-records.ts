import { toDateKey } from "@/lib/record-date";

export const REGIONAL_RECORD_MARKERS = ["NR", "NAR", "WR"] as const;
const REGIONAL_RECORD_MARKER_SET = new Set<string>(REGIONAL_RECORD_MARKERS);

export type StateRecordRow = {
  id: string;
  value: number;
  /** Effective 9i2 day: round local end date, else competition start_date */
  recordDate: Date | string;
  regionalRecord: string | null;
};

function isRegionalRecord(marker: string | null | undefined): boolean {
  if (marker == null) return false;
  return REGIONAL_RECORD_MARKER_SET.has(marker.trim());
}

/**
 * Tag SR for chronological improvements, collapsing to the best value per
 * calendar day (9i2) and skipping results that already hold NR/NAR/WR.
 */
export function markStateRecords(rows: StateRecordRow[], outIds: string[]) {
  let bestSoFar: number | null = null;
  let dayKey: string | null = null;
  let dayCandidates: StateRecordRow[] = [];

  const flushDay = () => {
    if (dayCandidates.length === 0) {
      return;
    }

    const improvements = dayCandidates.filter(
      (row) => bestSoFar === null || row.value <= bestSoFar,
    );

    if (improvements.length === 0) {
      dayCandidates = [];
      return;
    }

    const dayBest = Math.min(...improvements.map((row) => row.value));

    for (const row of improvements) {
      if (row.value === dayBest && !isRegionalRecord(row.regionalRecord)) {
        outIds.push(row.id);
      }
    }

    bestSoFar = dayBest;
    dayCandidates = [];
  };

  for (const row of rows) {
    if (row.value <= 0) continue;

    const key = toDateKey(row.recordDate);

    if (dayKey !== null && key !== dayKey) {
      flushDay();
    }

    dayKey = key;
    dayCandidates.push(row);
  }

  flushDay();
}
