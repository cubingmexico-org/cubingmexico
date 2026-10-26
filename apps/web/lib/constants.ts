/** Organización app (`apps/organizer`). Local default: http://localhost:3001 */
export const ORGANIZER_APP_URL =
  process.env.NEXT_PUBLIC_ORGANIZER_URL ??
  "https://certificados.cubingmexico.net";

/**
 * Mirrors the WCA's `Event.official` scope: ranks 800-989 are announced but
 * not yet official (e.g. fto), 990-999 are deprecated (333ft, magic, ...).
 */
export const OFFICIAL_EVENT_MAX_RANK = 800;
export const DEPRECATED_EVENT_MIN_RANK = 990;
export const DEPRECATED_EVENT_MAX_RANK = 999;

/** `official`: rank < 800. `all`: official plus deprecated (990-999); never fto. */
export const EVENT_SCOPES = ["official", "all"] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export const SINGLE_EVENTS = ["333fm", "333bf", "333mbf", "444bf", "555bf"];

export const BLD_FMC_MEANS_EVENTS = ["333bf", "333fm", "444bf", "555bf"];

export const SPEEDSOLVING_AVERAGES_EVENTS = [
  "333",
  "222",
  "444",
  "555",
  "666",
  "777",
  "333oh",
  "clock",
  "minx",
  "skewb",
  "sq1",
  "pyram",
];

export const eventNames: Record<string, string> = {
  "333": "Cubo 3x3x3",
  "222": "Cubo 2x2x2",
  "444": "Cubo 4x4x4",
  "555": "Cubo 5x5x5",
  "666": "Cubo 6x6x6",
  "777": "Cubo 7x7x7",
  "333bf": "3x3x3 Blindfolded",
  "333fm": "3x3x3 Fewest Moves",
  "333oh": "3x3x3 One-Handed",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4x4x4 Blindfolded",
  "555bf": "5x5x5 Blindfolded",
  "333mbf": "3x3x3 Multi-Blind",
  "333ft": "3x3x3 With Feet",
  magic: "Magic",
  mmagic: "Master Magic",
  "333mbo": "3x3x3 Multi-Blind Old Style",
};

/** Deprecated events that get their own column in cross-event tables (333mbo has no Mexican results). */
export const DEPRECATED_EVENT_IDS = ["333ft", "magic", "mmagic"] as const;

/** Old-style multi-blind has no comparable national record, so Kinch skips it (`KINCH_SKIPPED_EVENTS` in the backend). */
export const KINCH_SKIPPED_EVENT_IDS = ["333mbo"] as const;

export const SPECIALTY_EVENT_IDS = [
  "333",
  "222",
  "444",
  "555",
  "666",
  "777",
  "333bf",
  "333fm",
  "333oh",
  "clock",
  "minx",
  "pyram",
  "skewb",
  "sq1",
  "444bf",
  "555bf",
  "333mbf",
] as const;

/** Event columns of cross-event tables (Kinch, SOR), in event rank order. */
export function crossEventIds(scope: EventScope): string[] {
  return scope === "all"
    ? [...SPECIALTY_EVENT_IDS, ...DEPRECATED_EVENT_IDS]
    : [...SPECIALTY_EVENT_IDS];
}
