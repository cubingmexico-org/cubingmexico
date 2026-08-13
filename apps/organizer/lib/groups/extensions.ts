import type { Activity, Round, WcifExtension, WCIF } from "@/types/wcif";
import {
  findRoundActivities,
  getGroupActivitiesForRound,
} from "@/lib/groups/wcif-schedule";

const GROUPIFIER_ACTIVITY_CONFIG = "groupifier.ActivityConfig";
const DELEGATE_DASHBOARD_GROUPS = "delegateDashboard.groups";

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

function findExtension(
  extensions: WcifExtension[] | undefined,
  id: string,
): WcifExtension | undefined {
  return asExtensionList(extensions).find((ext) => ext.id === id);
}

export type SuggestedGroupCounts = {
  source: "groupifier" | "delegateDashboard";
  /** Same count for all stages when set. */
  groupCount?: number;
  /** roomId → count when per-room. */
  perRoomCounts?: Record<number, number>;
  spreadAcrossStages: boolean;
};

function readNumericGroups(data: unknown): number | null {
  if (typeof data === "number" && Number.isFinite(data) && data > 0) {
    return Math.floor(data);
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.groups === "number" && obj.groups > 0) {
      return Math.floor(obj.groups);
    }
    if (typeof obj.groupCount === "number" && obj.groupCount > 0) {
      return Math.floor(obj.groupCount);
    }
  }
  return null;
}

function readPerRoomMap(data: unknown): Record<number, number> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;
  // DD may store { groups: { [roomId]: n } } or groups as map directly
  const maybeMap =
    obj.groups && typeof obj.groups === "object" && !Array.isArray(obj.groups)
      ? (obj.groups as Record<string, unknown>)
      : obj;

  const result: Record<number, number> = {};
  let found = false;
  for (const [key, value] of Object.entries(maybeMap)) {
    if (key === "groups" || key === "groupCount" || key === "spreadGroupsAcrossAllStages") {
      continue;
    }
    const roomId = Number(key);
    const count = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(roomId) && Number.isFinite(count) && count >= 0) {
      result[roomId] = Math.floor(count);
      found = true;
    }
  }
  return found ? result : null;
}

/**
 * Suggest group counts from Groupifier / Delegate Dashboard extensions
 * on the round or on parent round activities.
 */
export function suggestGroupCountsFromExtensions(
  wcif: WCIF,
  roundActivityCode: string,
): SuggestedGroupCounts | null {
  const existing = getGroupActivitiesForRound(wcif, roundActivityCode);
  if (existing.length > 0) return null;

  const eventId = roundActivityCode.replace(/-r\d+$/, "");
  const round: Round | undefined = wcif.events
    .find((e) => e.id === eventId)
    ?.rounds.find((r) => r.id === roundActivityCode);

  const ddExt = findExtension(round?.extensions, DELEGATE_DASHBOARD_GROUPS);
  if (ddExt) {
    const data = ddExt.data as Record<string, unknown> | unknown;
    const spread =
      data &&
      typeof data === "object" &&
      (data as Record<string, unknown>).spreadGroupsAcrossAllStages !== false;

    const perRoom = readPerRoomMap(ddExt.data);
    const single = readNumericGroups(ddExt.data);

    if (perRoom && !spread) {
      return {
        source: "delegateDashboard",
        perRoomCounts: perRoom,
        spreadAcrossStages: false,
      };
    }
    if (single != null) {
      return {
        source: "delegateDashboard",
        groupCount: single,
        spreadAcrossStages: true,
      };
    }
    if (perRoom) {
      const values = Object.values(perRoom);
      const first = values[0] ?? 0;
      const allSame = values.every((v) => v === first);
      return {
        source: "delegateDashboard",
        groupCount: allSame ? first : undefined,
        perRoomCounts: perRoom,
        spreadAcrossStages: allSame,
      };
    }
  }

  const parents = findRoundActivities(wcif, roundActivityCode);
  const perRoomFromGroupifier: Record<number, number> = {};
  let any = false;
  let uniform: number | null = null;

  for (const parent of parents) {
    const ext = findExtension(
      parent.activity.extensions,
      GROUPIFIER_ACTIVITY_CONFIG,
    );
    const count = ext ? readNumericGroups(ext.data) : null;
    if (count != null) {
      perRoomFromGroupifier[parent.roomId] = count;
      any = true;
      if (uniform === null) uniform = count;
      else if (uniform !== count) uniform = -1;
    }
  }

  if (any) {
    if (uniform != null && uniform > 0) {
      return {
        source: "groupifier",
        groupCount: uniform,
        spreadAcrossStages: true,
      };
    }
    return {
      source: "groupifier",
      perRoomCounts: perRoomFromGroupifier,
      spreadAcrossStages: false,
    };
  }

  return null;
}

export function extensionSourceLabel(
  source: SuggestedGroupCounts["source"],
): string {
  return source === "groupifier" ? "Groupifier" : "Delegate Dashboard";
}

/** Exposed for tests / debugging. */
export function readActivityGroupifierConfig(
  activity: Activity,
): number | null {
  const ext = findExtension(activity.extensions, GROUPIFIER_ACTIVITY_CONFIG);
  return ext ? readNumericGroups(ext.data) : null;
}
