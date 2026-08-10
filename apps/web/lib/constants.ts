export const unknownError =
  "An unknown error occurred. Please try again later.";

/**
 * Annual summary feature. Keep false until public release later this year.
 * When enabled, entry is only via the logged-in user dropdown (not person pages).
 */
export const ANNUAL_SUMMARY_ENABLED =
  process.env.NEXT_PUBLIC_ANNUAL_SUMMARY_ENABLED === "true";

export const EXCLUDED_EVENTS = ["333ft", "333mbo", "magic", "mmagic"];

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

export const MEAN_EVENTS = ["666", "777", "333bf", "333fm", "444bf", "555bf"];

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
};

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
