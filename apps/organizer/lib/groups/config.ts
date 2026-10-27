import type { Activity, Room, WCIF, WcifExtension } from "@/types/wcif";
import { deepCloneWcif, findRoundActivities } from "@/lib/groups/wcif-schedule";

export const ORGANIZACION_COMPETITION_CONFIG = "organizacion.CompetitionConfig";
export const ORGANIZACION_ROOM_CONFIG = "organizacion.RoomConfig";
export const ORGANIZACION_ACTIVITY_CONFIG = "organizacion.ActivityConfig";

const GROUPIFIER_COMPETITION_CONFIG = "groupifier.CompetitionConfig";
export const GROUPIFIER_ROOM_CONFIG = "groupifier.RoomConfig";
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

export function setExtension(
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
