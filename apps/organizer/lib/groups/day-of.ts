import type { Person, WCIF } from "@/types/wcif";
import {
  findActivityById,
  getGroupActivitiesForRound,
  listAllActivitiesFlat,
  parseGroupNumber,
} from "@/lib/groups/wcif-schedule";

export type TimelineRow = {
  personName: string;
  wcaUserId: number;
  activityId: number;
  activityName: string;
  activityCode: string;
  assignmentCode: string;
  stationNumber: number | null;
  roomName: string;
  startTime: string;
  endTime: string;
  orphan: boolean;
  groupNumber: number | null;
};

export type GroupAssignmentRow = {
  personName: string;
  wcaUserId: number;
  wcaId: string | null;
  activityId: number;
  assignmentCode: string;
  stationNumber: number | null;
  roomName: string;
  roomId: number;
  groupNumber: number | null;
  activityName: string;
  orphan: boolean;
};

export type ScramblerRow = {
  personName: string;
  wcaUserId: number;
  activityId: number;
  activityName: string;
  roomName: string;
  roomId: number;
  dayKey: string;
  startTime: string;
  endTime: string;
  orphan: boolean;
};

function dayKeyFromIso(iso: string, startDate: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  } catch {
    return startDate;
  }
}

function codeLabel(code: string): string {
  switch (code) {
    case "competitor":
      return "Competidor";
    case "staff-judge":
      return "Juez";
    case "staff-scrambler":
      return "Scrambler";
    case "staff-runner":
      return "Runner";
    default:
      return code;
  }
}

export { codeLabel };

export function buildPersonTimeline(
  wcif: WCIF,
  wcaUserId: number,
): TimelineRow[] {
  const person = wcif.persons.find((p) => p.wcaUserId === wcaUserId);
  if (!person) return [];

  const rows: TimelineRow[] = [];
  for (const assignment of person.assignments ?? []) {
    const located = findActivityById(wcif, assignment.activityId);
    rows.push({
      personName: person.name,
      wcaUserId: person.wcaUserId,
      activityId: assignment.activityId,
      activityName:
        located?.activity.name ?? `Actividad #${assignment.activityId}`,
      activityCode: located?.activity.activityCode ?? "?",
      assignmentCode: assignment.assignmentCode,
      stationNumber: assignment.stationNumber,
      roomName: located?.roomName ?? "—",
      startTime: located?.activity.startTime ?? "",
      endTime: located?.activity.endTime ?? "",
      orphan: !located,
      groupNumber: located
        ? parseGroupNumber(located.activity.activityCode)
        : null,
    });
  }

  return rows.sort((a, b) => {
    const ta = a.startTime
      ? new Date(a.startTime).getTime()
      : Number.MAX_SAFE_INTEGER;
    const tb = b.startTime
      ? new Date(b.startTime).getTime()
      : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
}

export function findUnmatchedActivityIds(wcif: WCIF): number[] {
  const known = new Set(listAllActivitiesFlat(wcif).map((a) => a.activity.id));
  const unmatched = new Set<number>();
  for (const person of wcif.persons) {
    for (const assignment of person.assignments ?? []) {
      if (!known.has(assignment.activityId)) {
        unmatched.add(assignment.activityId);
      }
    }
  }
  return [...unmatched].sort((a, b) => a - b);
}

export function buildAssignmentsByGroup(
  wcif: WCIF,
  roundActivityCode: string,
): GroupAssignmentRow[] {
  const groups = getGroupActivitiesForRound(wcif, roundActivityCode);
  const groupById = new Map(groups.map((g) => [g.activity.id, g]));
  const knownIds = new Set(
    listAllActivitiesFlat(wcif).map((a) => a.activity.id),
  );

  const rows: GroupAssignmentRow[] = [];

  for (const person of wcif.persons) {
    for (const assignment of person.assignments ?? []) {
      const group = groupById.get(assignment.activityId);
      const located = findActivityById(wcif, assignment.activityId);
      const inRound =
        group != null ||
        (located != null &&
          (located.activity.activityCode === roundActivityCode ||
            located.activity.activityCode.startsWith(
              `${roundActivityCode}-g`,
            )));

      if (!inRound && knownIds.has(assignment.activityId)) {
        continue;
      }

      // Include orphans that might belong to this round if activityId unknown
      if (!inRound && !knownIds.has(assignment.activityId)) {
        // Only show orphans in troubleshooting when viewing any round —
        // attach them as orphan rows for visibility when round filter is active.
        rows.push({
          personName: person.name,
          wcaUserId: person.wcaUserId,
          wcaId: person.wcaId,
          activityId: assignment.activityId,
          assignmentCode: assignment.assignmentCode,
          stationNumber: assignment.stationNumber,
          roomName: "—",
          roomId: -1,
          groupNumber: null,
          activityName: `Desconocida #${assignment.activityId}`,
          orphan: true,
        });
        continue;
      }

      if (!inRound) continue;

      rows.push({
        personName: person.name,
        wcaUserId: person.wcaUserId,
        wcaId: person.wcaId,
        activityId: assignment.activityId,
        assignmentCode: assignment.assignmentCode,
        stationNumber: assignment.stationNumber,
        roomName: located?.roomName ?? group?.roomName ?? "—",
        roomId: located?.roomId ?? group?.roomId ?? -1,
        groupNumber: located
          ? parseGroupNumber(located.activity.activityCode)
          : group
            ? parseGroupNumber(group.activity.activityCode)
            : null,
        activityName:
          located?.activity.name ??
          group?.activity.name ??
          `Actividad #${assignment.activityId}`,
        orphan: !knownIds.has(assignment.activityId),
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.orphan !== b.orphan) return a.orphan ? 1 : -1;
    const g = (a.groupNumber ?? 999) - (b.groupNumber ?? 999);
    if (g !== 0) return g;
    if (a.roomId !== b.roomId) return a.roomId - b.roomId;
    return a.personName.localeCompare(b.personName, "es");
  });
}

export function buildScramblerSchedule(wcif: WCIF): ScramblerRow[] {
  const startDate = wcif.schedule.startDate;
  const rows: ScramblerRow[] = [];

  for (const person of wcif.persons) {
    for (const assignment of person.assignments ?? []) {
      if (assignment.assignmentCode !== "staff-scrambler") continue;
      const located = findActivityById(wcif, assignment.activityId);
      rows.push({
        personName: person.name,
        wcaUserId: person.wcaUserId,
        activityId: assignment.activityId,
        activityName:
          located?.activity.name ?? `Actividad #${assignment.activityId}`,
        roomName: located?.roomName ?? "—",
        roomId: located?.roomId ?? -1,
        dayKey: located
          ? dayKeyFromIso(located.activity.startTime, startDate)
          : "desconocido",
        startTime: located?.activity.startTime ?? "",
        endTime: located?.activity.endTime ?? "",
        orphan: !located,
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
    if (a.roomName !== b.roomName)
      return a.roomName.localeCompare(b.roomName, "es");
    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
    if (ta !== tb) return ta - tb;
    return a.personName.localeCompare(b.personName, "es");
  });
}

export function personsWithAssignments(wcif: WCIF): Person[] {
  return wcif.persons
    .filter((p) => (p.assignments ?? []).length > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
