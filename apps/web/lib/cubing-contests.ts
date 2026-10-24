import { formatTime } from "@/lib/utils";
import type { CcRecordMarker } from "@/lib/cubing-contests-records";

/**
 * Unofficial events from Cubing Contests (https://cubingcontests.com), held at
 * WCA competitions. They live in the `cc_*` tables and never take part in the
 * official/all event scopes.
 */

export const CC_SITE_URL = "https://cubingcontests.com";
export const CC_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

export type CcEventFormat = "time" | "number" | "multi";
export type CcResultValueType = "single" | "average";

export interface CcEventOption {
  id: string;
  name: string;
  format: CcEventFormat;
  participants: number;
}

export interface CcCompetitor {
  ccPersonId: number;
  name: string;
  /** Set only when the person exists in `persons`, so the profile link resolves. */
  wcaId: string | null;
  stateName: string | null;
}

export interface CcResultRow {
  resultId: number;
  eventId: string;
  eventName: string;
  eventFormat: CcEventFormat;
  competitionId: string;
  competitionName: string;
  date: Date;
  roundTypeId: string | null;
  roundNumber: number;
  formatId: string;
  position: number | null;
  best: number;
  average: number;
  attempts: number[];
  singleRecord: CcRecordMarker | null;
  averageRecord: CcRecordMarker | null;
  competitors: CcCompetitor[];
}

export interface CcEventResultsGroup {
  eventId: string;
  eventName: string;
  eventFormat: CcEventFormat;
  results: CcResultRow[];
}

/** Classes available in `@cubing/icons` 1.1.3 under `.unofficial-*`. */
const CC_UNOFFICIAL_ICON_IDS = new Set([
  "222bf",
  "222oh",
  "234567relay",
  "23456relay",
  "2345relay",
  "234relay",
  "333_linear_fm",
  "333_mirror_blocks",
  "333_mirror_blocks_bld",
  "333_oh_bld_relay",
  "333_oh_bld_team_relay",
  "333_speed_bld",
  "333_team_bld",
  "333_team_factory",
  "333bf_2_person_relay",
  "333bf_3_person_relay",
  "333bf_4_person_relay",
  "333bf_8_person_relay",
  "333mts",
  "444ft",
  "666bf",
  "777bf",
  "curvycopter",
  "fisher",
  "fto",
  "helicopter",
  "kilominx",
  "miniguild",
  "miniguild_2_person",
  "miniguild_bld",
  "mpyram",
  "mskewb",
  "mtetram",
  "pyramorphix",
  "redi",
]);

/** Former WCA events keep their `.event-*` icon. */
const CC_WCA_ICON_IDS = new Set(["magic", "mmagic", "333ft", "333mbo"]);

/** Full `className` for the event's icon, or null when `@cubing/icons` has none. */
export function ccIconClass(eventId: string): string | null {
  if (CC_UNOFFICIAL_ICON_IDS.has(eventId)) {
    return `cubing-icon unofficial-${eventId}`;
  }
  if (CC_WCA_ICON_IDS.has(eventId)) {
    return `cubing-icon event-${eventId}`;
  }
  return null;
}

const CC_UNKNOWN_TIME = 8640000;

/**
 * Cubing Contests multi format: (-)DDDDTTTTTTTMMMM, with the time in
 * centiseconds and DNFs stored as negative numbers.
 */
function formatCcMulti(value: number): string {
  const abs = Math.abs(value);
  const missed = abs % 10000;
  const timeCs = Math.floor(abs / 10000) % 10000000;
  const difference = 9999 - Math.floor(abs / 100000000000);
  const solved = difference + missed;
  const attempted = solved + missed;
  const score = `${solved}/${attempted}`;
  const body =
    timeCs === CC_UNKNOWN_TIME ? score : `${score} ${formatTime(timeCs)}`;
  return value < 0 ? `DNF (${body})` : body;
}

/** Null for "no attempt" (0); DNF/DNS for -1/-2. */
export function formatCcResult(
  format: CcEventFormat,
  value: number,
  type: CcResultValueType = "single",
): string | null {
  if (value === 0) return null;
  if (value === -1) return "DNF";
  if (value === -2) return "DNS";

  if (format === "number") {
    return type === "average" ? (value / 100).toFixed(2) : `${value}`;
  }
  if (format === "multi") {
    return formatCcMulti(value);
  }
  if (value === CC_UNKNOWN_TIME) return "?";
  return formatTime(value);
}

export interface CcYearSummary {
  resultCount: number;
  competitionCount: number;
  events: { eventId: string; eventName: string }[];
  podiums: { gold: number; silver: number; bronze: number };
}

export interface CcYearSummaryRow {
  eventId: string;
  eventName: string;
  competitionId: string;
  roundTypeId: string | null;
  position: number | null;
  best: number;
}

/** Rows must be in event order. A podium is a top-3 finish in a final with a valid single. */
export function summarizeCcYear(rows: CcYearSummaryRow[]): CcYearSummary {
  const events = new Map<string, string>();
  const podiums = { gold: 0, silver: 0, bronze: 0 };
  for (const row of rows) {
    if (!events.has(row.eventId)) events.set(row.eventId, row.eventName);
    const isFinal = row.roundTypeId === "f" || row.roundTypeId === "c";
    if (!isFinal || row.best <= 0) continue;
    if (row.position === 1) podiums.gold++;
    else if (row.position === 2) podiums.silver++;
    else if (row.position === 3) podiums.bronze++;
  }
  return {
    resultCount: rows.length,
    competitionCount: new Set(rows.map((row) => row.competitionId)).size,
    events: Array.from(events, ([eventId, eventName]) => ({
      eventId,
      eventName,
    })),
    podiums,
  };
}

/** Lower is better; DNF, DNS and empty values never rank. */
export function isCcRankable(value: number): boolean {
  return value > 0;
}
