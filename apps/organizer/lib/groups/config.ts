import type { Activity, Room, WcifExtension, WCIF } from "@/types/wcif";
import {
  deepCloneWcif,
  findRoundActivities,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import { suggestGroupCountsFromExtensions } from "@/lib/groups/extensions";
import {
  suggestStaffForRound,
  suggestedGroupCount,
  suggestedRunners,
  suggestedScramblers,
  type StaffSuggestion,
} from "@/lib/groups/formulas";

export const ORGANIZACION_COMPETITION_CONFIG = "organizacion.CompetitionConfig";
export const ORGANIZACION_ROOM_CONFIG = "organizacion.RoomConfig";
export const ORGANIZACION_ACTIVITY_CONFIG = "organizacion.ActivityConfig";

const GROUPIFIER_COMPETITION_CONFIG = "groupifier.CompetitionConfig";
const GROUPIFIER_ROOM_CONFIG = "groupifier.RoomConfig";
const GROUPIFIER_ACTIVITY_CONFIG = "groupifier.ActivityConfig";

export type CompetitorsSortingRule =
  | "ranks"
  | "balanced"
  | "symmetric"
  | "name-optimised";

export type ScorecardPaperSize = "a4" | "letter" | "a6";
export type ScorecardOrder = "natural" | "stacked";
export type ScorecardDensity = "compact" | "comfortable";
export type ScorecardsBackgroundMode = "competition" | "custom" | "none";

export type CompetitionConfig = {
  competitorsSortingRule: CompetitorsSortingRule;
  noTasksForNewcomers: boolean;
  tasksForOwnEventsOnly: boolean;
  noRunningForForeigners: boolean;
  localNamesFirst: boolean;
  printOneName: boolean;
  scorecardsBackgroundMode: ScorecardsBackgroundMode;
  scorecardsBackgroundUrl: string;
  printStations: boolean;
  scorecardPaperSize: ScorecardPaperSize;
  scorecardOrder: ScorecardOrder;
  scorecardDensity: ScorecardDensity;
  printScorecardsCoverSheets: boolean;
  printPersonalBests: boolean;
  printScorecardQr: boolean;
  printScrambleCheckerForTopRankedCompetitors: boolean;
  printScrambleCheckerForFinalRounds: boolean;
  printScrambleCheckerForBlankScorecards: boolean;
  assignScramblers: boolean;
  assignRunners: boolean;
  assignJudges: boolean;
};

export type RoomConfig = {
  stations: number;
};

export type ActivityConfig = {
  capacity: number;
  groups: number;
  scramblers: number;
  runners: number;
  assignJudges: boolean;
};

export const DEFAULT_COMPETITION_CONFIG: CompetitionConfig = {
  competitorsSortingRule: "symmetric",
  noTasksForNewcomers: true,
  tasksForOwnEventsOnly: true,
  noRunningForForeigners: true,
  localNamesFirst: false,
  printOneName: false,
  scorecardsBackgroundMode: "competition",
  scorecardsBackgroundUrl: "",
  printStations: false,
  scorecardPaperSize: "letter",
  scorecardOrder: "natural",
  scorecardDensity: "compact",
  printScorecardsCoverSheets: true,
  printPersonalBests: false,
  printScorecardQr: true,
  printScrambleCheckerForTopRankedCompetitors: false,
  printScrambleCheckerForFinalRounds: false,
  printScrambleCheckerForBlankScorecards: false,
  assignScramblers: true,
  assignRunners: true,
  assignJudges: true,
};

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  stations: 0,
};

export const DEFAULT_ACTIVITY_CONFIG: ActivityConfig = {
  capacity: 1,
  groups: 2,
  scramblers: 1,
  runners: 1,
  assignJudges: true,
};

function asExtensionList(value: unknown): WcifExtension[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is WcifExtension =>
      !!item &&
      typeof item === "object" &&
      "id" in item &&
      typeof (item as WcifExtension).id === "string",
  );
}

export function findExtension(
  extensions: WcifExtension[] | undefined,
  id: string,
): WcifExtension | undefined {
  return asExtensionList(extensions).find((ext) => ext.id === id);
}

function setExtension(
  extensions: WcifExtension[] | undefined,
  id: string,
  data: unknown,
): WcifExtension[] {
  const list = asExtensionList(extensions);
  const next = list.filter((ext) => ext.id !== id);
  next.push({ id, data });
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readBool(
  data: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = data[key];
  return typeof value === "boolean" ? value : fallback;
}

function readString(
  data: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readSortingRule(value: unknown): CompetitorsSortingRule {
  if (
    value === "ranks" ||
    value === "balanced" ||
    value === "symmetric" ||
    value === "name-optimised"
  ) {
    return value;
  }
  return DEFAULT_COMPETITION_CONFIG.competitorsSortingRule;
}

function readPaperSize(value: unknown): ScorecardPaperSize {
  if (value === "a4" || value === "letter" || value === "a6") return value;
  return DEFAULT_COMPETITION_CONFIG.scorecardPaperSize;
}

function readOrder(value: unknown): ScorecardOrder {
  if (value === "natural" || value === "stacked") return value;
  return DEFAULT_COMPETITION_CONFIG.scorecardOrder;
}

function readDensity(value: unknown): ScorecardDensity {
  if (value === "compact" || value === "comfortable") return value;
  return DEFAULT_COMPETITION_CONFIG.scorecardDensity;
}

function readBackgroundMode(
  data: Record<string, unknown>,
): ScorecardsBackgroundMode {
  const mode = data.scorecardsBackgroundMode;
  if (mode === "competition" || mode === "custom" || mode === "none") {
    return mode;
  }
  // Legacy: URL field used "none" sentinel or a custom string
  const url =
    typeof data.scorecardsBackgroundUrl === "string"
      ? data.scorecardsBackgroundUrl.trim()
      : "";
  if (url.toLowerCase() === "none") return "none";
  if (url) return "custom";
  return DEFAULT_COMPETITION_CONFIG.scorecardsBackgroundMode;
}

function parseCompetitionConfig(data: unknown): CompetitionConfig {
  if (!isRecord(data)) return { ...DEFAULT_COMPETITION_CONFIG };
  const scorecardsBackgroundMode = readBackgroundMode(data);
  let scorecardsBackgroundUrl = readString(
    data,
    "scorecardsBackgroundUrl",
    DEFAULT_COMPETITION_CONFIG.scorecardsBackgroundUrl,
  );
  if (scorecardsBackgroundUrl.toLowerCase() === "none") {
    scorecardsBackgroundUrl = "";
  }
  return {
    competitorsSortingRule: readSortingRule(data.competitorsSortingRule),
    noTasksForNewcomers: readBool(
      data,
      "noTasksForNewcomers",
      DEFAULT_COMPETITION_CONFIG.noTasksForNewcomers,
    ),
    tasksForOwnEventsOnly: readBool(
      data,
      "tasksForOwnEventsOnly",
      DEFAULT_COMPETITION_CONFIG.tasksForOwnEventsOnly,
    ),
    noRunningForForeigners: readBool(
      data,
      "noRunningForForeigners",
      DEFAULT_COMPETITION_CONFIG.noRunningForForeigners,
    ),
    localNamesFirst: readBool(
      data,
      "localNamesFirst",
      DEFAULT_COMPETITION_CONFIG.localNamesFirst,
    ),
    printOneName: readBool(
      data,
      "printOneName",
      DEFAULT_COMPETITION_CONFIG.printOneName,
    ),
    scorecardsBackgroundMode,
    scorecardsBackgroundUrl,
    printStations: readBool(
      data,
      "printStations",
      DEFAULT_COMPETITION_CONFIG.printStations,
    ),
    scorecardPaperSize: readPaperSize(data.scorecardPaperSize),
    scorecardOrder: readOrder(data.scorecardOrder),
    scorecardDensity: readDensity(data.scorecardDensity),
    printScorecardsCoverSheets: readBool(
      data,
      "printScorecardsCoverSheets",
      DEFAULT_COMPETITION_CONFIG.printScorecardsCoverSheets,
    ),
    printPersonalBests: readBool(
      data,
      "printPersonalBests",
      DEFAULT_COMPETITION_CONFIG.printPersonalBests,
    ),
    printScorecardQr: readBool(
      data,
      "printScorecardQr",
      DEFAULT_COMPETITION_CONFIG.printScorecardQr,
    ),
    printScrambleCheckerForTopRankedCompetitors: readBool(
      data,
      "printScrambleCheckerForTopRankedCompetitors",
      DEFAULT_COMPETITION_CONFIG.printScrambleCheckerForTopRankedCompetitors,
    ),
    printScrambleCheckerForFinalRounds: readBool(
      data,
      "printScrambleCheckerForFinalRounds",
      DEFAULT_COMPETITION_CONFIG.printScrambleCheckerForFinalRounds,
    ),
    printScrambleCheckerForBlankScorecards: readBool(
      data,
      "printScrambleCheckerForBlankScorecards",
      DEFAULT_COMPETITION_CONFIG.printScrambleCheckerForBlankScorecards,
    ),
    assignScramblers: readBool(
      data,
      "assignScramblers",
      DEFAULT_COMPETITION_CONFIG.assignScramblers,
    ),
    assignRunners: readBool(
      data,
      "assignRunners",
      DEFAULT_COMPETITION_CONFIG.assignRunners,
    ),
    assignJudges: readBool(
      data,
      "assignJudges",
      DEFAULT_COMPETITION_CONFIG.assignJudges,
    ),
  };
}

function parseRoomConfig(data: unknown): RoomConfig {
  if (!isRecord(data)) return { ...DEFAULT_ROOM_CONFIG };
  const stations =
    typeof data.stations === "number" && Number.isFinite(data.stations)
      ? Math.max(0, Math.floor(data.stations))
      : DEFAULT_ROOM_CONFIG.stations;
  return { stations };
}

function parseActivityConfig(data: unknown): ActivityConfig {
  if (!isRecord(data)) return { ...DEFAULT_ACTIVITY_CONFIG };
  return {
    capacity:
      typeof data.capacity === "number" && data.capacity > 0
        ? data.capacity
        : DEFAULT_ACTIVITY_CONFIG.capacity,
    groups:
      typeof data.groups === "number" && data.groups >= 1
        ? Math.floor(data.groups)
        : DEFAULT_ACTIVITY_CONFIG.groups,
    scramblers:
      typeof data.scramblers === "number" && data.scramblers >= 0
        ? Math.floor(data.scramblers)
        : DEFAULT_ACTIVITY_CONFIG.scramblers,
    runners:
      typeof data.runners === "number" && data.runners >= 0
        ? Math.floor(data.runners)
        : DEFAULT_ACTIVITY_CONFIG.runners,
    assignJudges:
      typeof data.assignJudges === "boolean"
        ? data.assignJudges
        : DEFAULT_ACTIVITY_CONFIG.assignJudges,
  };
}

export function getCompetitionConfig(wcif: WCIF): CompetitionConfig {
  const org = findExtension(wcif.extensions, ORGANIZACION_COMPETITION_CONFIG);
  if (org) return parseCompetitionConfig(org.data);
  const gf = findExtension(wcif.extensions, GROUPIFIER_COMPETITION_CONFIG);
  if (gf) return parseCompetitionConfig(gf.data);
  return { ...DEFAULT_COMPETITION_CONFIG };
}

export function setCompetitionConfig(
  wcif: WCIF,
  config: CompetitionConfig,
): WCIF {
  const draft = deepCloneWcif(wcif);
  draft.extensions = setExtension(
    draft.extensions,
    ORGANIZACION_COMPETITION_CONFIG,
    config,
  );
  return draft;
}

export function getRoomConfig(room: Room): RoomConfig {
  const org = findExtension(room.extensions, ORGANIZACION_ROOM_CONFIG);
  if (org) return parseRoomConfig(org.data);
  const gf = findExtension(room.extensions, GROUPIFIER_ROOM_CONFIG);
  if (gf) return parseRoomConfig(gf.data);
  return { ...DEFAULT_ROOM_CONFIG };
}

export function setRoomStations(
  wcif: WCIF,
  roomId: number,
  stations: number,
): WCIF {
  const draft = deepCloneWcif(wcif);
  for (const venue of draft.schedule.venues) {
    for (const room of venue.rooms) {
      if (room.id !== roomId) continue;
      room.extensions = setExtension(
        room.extensions,
        ORGANIZACION_ROOM_CONFIG,
        {
          stations: Math.max(0, Math.floor(stations)),
        },
      );
      return draft;
    }
  }
  return draft;
}

export function getActivityConfig(activity: Activity): ActivityConfig {
  const org = findExtension(activity.extensions, ORGANIZACION_ACTIVITY_CONFIG);
  if (org) return parseActivityConfig(org.data);
  const gf = findExtension(activity.extensions, GROUPIFIER_ACTIVITY_CONFIG);
  if (gf) return parseActivityConfig(gf.data);
  return { ...DEFAULT_ACTIVITY_CONFIG };
}

export function setActivityConfig(
  wcif: WCIF,
  activityId: number,
  config: ActivityConfig,
): WCIF {
  const draft = deepCloneWcif(wcif);
  for (const venue of draft.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        if (activity.id !== activityId) continue;
        activity.extensions = setExtension(
          activity.extensions,
          ORGANIZACION_ACTIVITY_CONFIG,
          config,
        );
        return draft;
      }
    }
  }
  return draft;
}

export function hasOrganizacionActivityConfig(activity: Activity): boolean {
  return !!findExtension(activity.extensions, ORGANIZACION_ACTIVITY_CONFIG);
}

/** True when any parent round activity already has a saved groups config. */
export function roundHasActivityConfig(
  wcif: WCIF,
  roundActivityCode: string,
): boolean {
  const parents = findRoundActivities(wcif, roundActivityCode);
  return parents.some(
    (parent) =>
      hasOrganizacionActivityConfig(parent.activity) &&
      getActivityConfig(parent.activity).groups >= 1,
  );
}

export function setRoundActivityConfigs(
  wcif: WCIF,
  roundActivityCode: string,
  buildConfig: (params: {
    parentRoomId: number;
    groups: number;
    stations: number;
    parentCount: number;
  }) => ActivityConfig,
  groupsByRoom: Record<number, number>,
): WCIF {
  let draft = wcif;
  const parents = findRoundActivities(wcif, roundActivityCode);
  for (const parent of parents) {
    const room = wcif.schedule.venues
      .flatMap((v) => v.rooms)
      .find((r) => r.id === parent.roomId);
    const stations = room ? getRoomConfig(room).stations : 0;
    const groups =
      groupsByRoom[parent.roomId] ??
      getActivityConfig(parent.activity).groups ??
      2;
    draft = setActivityConfig(
      draft,
      parent.activity.id,
      buildConfig({
        parentRoomId: parent.roomId,
        groups,
        stations,
        parentCount: parents.length,
      }),
    );
  }
  return draft;
}

export type PopulateActivityConfigOptions = {
  force?: boolean;
  scramblers?: number;
  runners?: number;
  assignScramblers?: boolean;
  assignRunners?: boolean;
  assignJudges?: boolean;
};

export type InitialStaffPreview = StaffSuggestion & {
  competitors: number;
  stations: number;
};

/** Preview staff counts for the largest Round-1 field (Config tab card). */
export function suggestInitialStaffPreview(wcif: WCIF): InitialStaffPreview {
  const competitors = largestRound1Field(wcif);
  const stations = suggestStationsBreakdown(wcif).perRoom;
  const competitionConfig = getCompetitionConfig(wcif);
  const suggestion = suggestStaffForRound({
    stations,
    competitors: Math.max(competitors, 1),
    roundNumber: 1,
    assignScramblers: competitionConfig.assignScramblers,
    assignRunners: competitionConfig.assignRunners,
    assignJudges: competitionConfig.assignJudges,
  });
  return { ...suggestion, competitors, stations };
}

export { type StaffSuggestion } from "@/lib/groups/formulas";

export function listRooms(wcif: WCIF): Array<{
  room: Room;
  venueName: string;
  config: RoomConfig;
}> {
  const list: Array<{ room: Room; venueName: string; config: RoomConfig }> = [];
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      list.push({
        room,
        venueName: venue.name,
        config: getRoomConfig(room),
      });
    }
  }
  return list;
}

export function countCompetingInEvent(wcif: WCIF, eventId: string): number {
  return wcif.persons.filter(
    (p) =>
      p.registration?.isCompeting === true &&
      (p.registration.eventIds ?? []).includes(eventId as never),
  ).length;
}

/** Largest Round-1 competing field across events. */
export function largestRound1Field(wcif: WCIF): number {
  let maxCompetitors = 0;
  for (const event of wcif.events) {
    if (!event.rounds[0]) continue;
    maxCompetitors = Math.max(
      maxCompetitors,
      countCompetingInEvent(wcif, event.id),
    );
  }
  return maxCompetitors;
}

/**
 * Suggested total timers for the venue (all stages), by MX practice:
 * small ~6, medium ~8, larger ~10–12, championships scale up (set manually past this).
 */
export function suggestedTotalStations(competitors: number): number {
  if (competitors <= 0) return 8;
  if (competitors <= 40) return 6;
  if (competitors <= 80) return 8;
  if (competitors <= 120) return 12; // e.g. 2 zones × 6 for ~80–100
  if (competitors <= 200) return 16;
  if (competitors <= 300) return 24;
  return 32;
}

export type StationsSuggestion = {
  /** Per-room / per-zone station count to apply. */
  perRoom: number;
  /** Implied venue total (perRoom × roomCount). */
  total: number;
  roomCount: number;
  competitors: number;
};

/**
 * Suggest stations per room from field size and number of salas.
 * Multi-zone example: 90 competitors + 2 rooms → 12 total → 6 each.
 */
export function suggestedStationsForCompetition(wcif: WCIF): number {
  return suggestStationsBreakdown(wcif).perRoom;
}

export function suggestStationsBreakdown(wcif: WCIF): StationsSuggestion {
  const competitors = largestRound1Field(wcif);
  const roomCount = Math.max(1, listRooms(wcif).length);
  const venueTotal = suggestedTotalStations(competitors);
  // Split across stages; keep at least 4 so tiny parallel rooms stay usable.
  // Championship 32+ is set manually — soft-cap suggestion at 32 per room.
  const perRoom = Math.min(32, Math.max(4, Math.round(venueTotal / roomCount)));
  return {
    perRoom,
    total: perRoom * roomCount,
    roomCount,
    competitors,
  };
}

export function ensureDefaultRoomStations(wcif: WCIF): WCIF {
  const draft = deepCloneWcif(wcif);
  const { perRoom } = suggestStationsBreakdown(draft);
  let changed = false;
  for (const venue of draft.schedule.venues) {
    for (const room of venue.rooms) {
      const existing = getRoomConfig(room);
      if (existing.stations > 0) continue;
      const org = findExtension(room.extensions, ORGANIZACION_ROOM_CONFIG);
      const gf = findExtension(room.extensions, GROUPIFIER_ROOM_CONFIG);
      if (org || gf) continue;
      room.extensions = setExtension(
        room.extensions,
        ORGANIZACION_ROOM_CONFIG,
        {
          stations: perRoom,
        },
      );
      changed = true;
    }
  }
  return changed ? draft : wcif;
}

/**
 * Populate ActivityConfig on parent round activities from stations + competitor counts.
 * Prefer existing Organización/Groupifier values when already set with groups > 0
 * and we are not forcing.
 */
export function populateActivityConfigsForRound(
  wcif: WCIF,
  roundActivityCode: string,
  options?: PopulateActivityConfigOptions,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const parsed = parseRoundActivityCode(roundActivityCode);
  if (!parsed) return draft;

  const competitionConfig = getCompetitionConfig(draft);
  const assignScramblers =
    options?.assignScramblers ?? competitionConfig.assignScramblers;
  const assignRunners =
    options?.assignRunners ?? competitionConfig.assignRunners;
  const assignJudges = options?.assignJudges ?? competitionConfig.assignJudges;

  const competitors = countCompetingInEvent(draft, parsed.eventId);
  const parents = findRoundActivities(draft, roundActivityCode);
  if (parents.length === 0) return draft;

  const foreign = suggestGroupCountsFromExtensions(draft, roundActivityCode);

  for (const parent of parents) {
    const room = draft.schedule.venues
      .flatMap((v) => v.rooms)
      .find((r) => r.id === parent.roomId);
    const stations = room ? getRoomConfig(room).stations : 0;
    const current = getActivityConfig(parent.activity);
    const hasOrg = hasOrganizacionActivityConfig(parent.activity);

    if (hasOrg && !options?.force && current.groups >= 1) {
      continue;
    }

    let groups: number;
    if (foreign?.spreadAcrossStages && foreign.groupCount != null) {
      groups = foreign.groupCount;
    } else if (foreign?.perRoomCounts?.[parent.roomId] != null) {
      groups = foreign.perRoomCounts[parent.roomId] ?? 1;
    } else {
      groups = suggestedGroupCount({
        competitors: Math.max(
          1,
          Math.round(competitors / Math.max(parents.length, 1)),
        ),
        stations,
        roundNumber: parsed.roundNumber,
      });
    }

    const groupCompetitors = Math.ceil(competitors / Math.max(groups, 1));
    const stationsInUse = Math.min(
      stations || groupCompetitors,
      groupCompetitors,
    );

    const scramblers = assignScramblers
      ? (options?.scramblers ?? suggestedScramblers(stationsInUse))
      : 0;
    const runners = assignRunners
      ? (options?.runners ?? suggestedRunners(stationsInUse))
      : 0;

    const config: ActivityConfig = {
      capacity: 1 / Math.max(parents.length, 1),
      groups,
      scramblers,
      runners,
      assignJudges: assignJudges && stations > 0,
    };

    parent.activity.extensions = setExtension(
      parent.activity.extensions,
      ORGANIZACION_ACTIVITY_CONFIG,
      config,
    );
  }

  return draft;
}

const SKIP_INITIAL_CONFIG_EVENTS = new Set(["333fm", "333mbf"]);

/** Apply ActivityConfig to every scheduled round (Groupifier initial configuration). */
export function populateActivityConfigsForAllRounds(
  wcif: WCIF,
  options?: PopulateActivityConfigOptions,
): { wcif: WCIF; roundCount: number } {
  let draft = wcif;
  let roundCount = 0;
  for (const event of wcif.events) {
    if (SKIP_INITIAL_CONFIG_EVENTS.has(event.id)) continue;
    for (const round of event.rounds) {
      const parents = findRoundActivities(draft, round.id);
      if (parents.length === 0) continue;
      draft = populateActivityConfigsForRound(draft, round.id, {
        ...options,
        force: options?.force ?? true,
      });
      roundCount++;
    }
  }
  return { wcif: draft, roundCount };
}

export function suggestedGroupsForRound(
  wcif: WCIF,
  roundActivityCode: string,
): {
  groupCount: number;
  perRoomCounts: Record<number, number>;
  spreadAcrossStages: boolean;
  stations: number;
  competitors: number;
} {
  const parsed = parseRoundActivityCode(roundActivityCode);
  const competitors = parsed ? countCompetingInEvent(wcif, parsed.eventId) : 0;
  const parents = findRoundActivities(wcif, roundActivityCode);
  const foreign = suggestGroupCountsFromExtensions(wcif, roundActivityCode);

  if (foreign?.spreadAcrossStages && foreign.groupCount != null) {
    const stations = parents.reduce((max, p) => {
      const room = wcif.schedule.venues
        .flatMap((v) => v.rooms)
        .find((r) => r.id === p.roomId);
      return Math.max(max, room ? getRoomConfig(room).stations : 0);
    }, 0);
    return {
      groupCount: foreign.groupCount,
      perRoomCounts: Object.fromEntries(
        parents.map((p) => [p.roomId, foreign.groupCount ?? 2]),
      ),
      spreadAcrossStages: true,
      stations,
      competitors,
    };
  }

  if (foreign?.perRoomCounts) {
    return {
      groupCount: Math.max(...Object.values(foreign.perRoomCounts), 1),
      perRoomCounts: { ...foreign.perRoomCounts },
      spreadAcrossStages: false,
      stations: 0,
      competitors,
    };
  }

  const perRoomCounts: Record<number, number> = {};
  let maxStations = 0;
  for (const parent of parents) {
    const room = wcif.schedule.venues
      .flatMap((v) => v.rooms)
      .find((r) => r.id === parent.roomId);
    const stations = room ? getRoomConfig(room).stations : 0;
    maxStations = Math.max(maxStations, stations);
    const share = Math.max(
      1,
      Math.round(competitors / Math.max(parents.length, 1)),
    );
    perRoomCounts[parent.roomId] = suggestedGroupCount({
      competitors: share,
      stations,
      roundNumber: parsed?.roundNumber ?? 1,
    });
  }

  const values = Object.values(perRoomCounts);
  const first = values[0] ?? 2;
  const allSame = values.length > 0 && values.every((v) => v === first);

  return {
    groupCount: allSame ? first : Math.max(...values, 1),
    perRoomCounts,
    spreadAcrossStages: allSame || parents.length <= 1,
    stations: maxStations,
    competitors,
  };
}
