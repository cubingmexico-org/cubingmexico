/** Suggested stations, staff and groups, and filling in Organización configs from them. */

import type { Room, WCIF } from "@/types/wcif";
import {
  deepCloneWcif,
  findRoundActivities,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import { suggestGroupCountsFromExtensions } from "@/lib/groups/extensions";
import {
  type StaffSuggestion,
  suggestedGroupCount,
  suggestedRunners,
  suggestedScramblers,
  suggestStaffForRound,
} from "@/lib/groups/formulas";
import {
  type ActivityConfig,
  findExtension,
  getActivityConfig,
  getCompetitionConfig,
  getRoomConfig,
  GROUPIFIER_ROOM_CONFIG,
  hasOrganizacionActivityConfig,
  ORGANIZACION_ACTIVITY_CONFIG,
  ORGANIZACION_ROOM_CONFIG,
  type RoomConfig,
  setExtension,
} from "@/lib/groups/config";

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
