import { markStateRecords, type StateRecordRow } from "@/lib/mark-state-records";

/**
 * Unofficial national (UNR) and state (USR) records for Cubing Contests
 * results, with the same rules as official SR: chronological improvements,
 * collapsed to the best result per calendar day (ties all count), and a
 * national record is never also marked as a state record.
 */

export type CcRecordMarker = "UNR" | "USR";
export type CcRecordType = "single" | "average";

export interface CcRecordInputRow {
  resultId: number;
  eventId: string;
  date: Date | string;
  best: number;
  average: number;
  /** At least one member is Mexican; only these can hold UNR/USR. */
  hasMexican: boolean;
  /** States of the members that have one. */
  stateNames: string[];
}

export interface CcRecordMarkers {
  single: CcRecordMarker | null;
  average: CcRecordMarker | null;
}

export interface CcRecordHistoryEntry {
  resultId: number;
  eventId: string;
  type: CcRecordType;
  /** "national", or the state whose progression this result is part of. */
  scope: string;
}

export const CC_NATIONAL_SCOPE = "national";

function progression(rows: CcRecordInputRow[], type: CcRecordType): number[] {
  const input: StateRecordRow[] = rows.map((row) => ({
    id: String(row.resultId),
    value: type === "single" ? row.best : row.average,
    recordDate: row.date,
    regionalRecord: null,
  }));
  const out: string[] = [];
  markStateRecords(input, out);
  return out.map(Number);
}

function dateValue(date: Date | string): number {
  return new Date(date).getTime();
}

export function computeCcRecordMarkers(rows: CcRecordInputRow[]): {
  markers: Map<number, CcRecordMarkers>;
  history: CcRecordHistoryEntry[];
} {
  const markers = new Map<number, CcRecordMarkers>();
  const history: CcRecordHistoryEntry[] = [];

  const setMarker = (
    resultId: number,
    type: CcRecordType,
    marker: CcRecordMarker,
  ) => {
    const current = markers.get(resultId) ?? { single: null, average: null };
    if (current[type] !== "UNR") current[type] = marker;
    markers.set(resultId, current);
  };

  const byEvent = new Map<string, CcRecordInputRow[]>();
  for (const row of rows) {
    if (!row.hasMexican) continue;
    const list = byEvent.get(row.eventId) ?? [];
    list.push(row);
    byEvent.set(row.eventId, list);
  }

  for (const [eventId, eventRows] of byEvent) {
    const ordered = eventRows
      .slice()
      .sort(
        (a, b) => dateValue(a.date) - dateValue(b.date) || a.resultId - b.resultId,
      );
    const states = new Set(ordered.flatMap((row) => row.stateNames));

    for (const type of ["single", "average"] as const) {
      const national = new Set(progression(ordered, type));
      for (const resultId of national) {
        setMarker(resultId, type, "UNR");
        history.push({ resultId, eventId, type, scope: CC_NATIONAL_SCOPE });
      }

      for (const stateName of states) {
        const stateRows = ordered.filter((row) =>
          row.stateNames.includes(stateName),
        );
        for (const resultId of progression(stateRows, type)) {
          if (!national.has(resultId)) setMarker(resultId, type, "USR");
          history.push({ resultId, eventId, type, scope: stateName });
        }
      }
    }
  }

  return { markers, history };
}
