import { exportRowsToCsv } from "@/lib/export-csv";
import type { WCIF } from "@/types/wcif";
import {
  findActivityById,
  getGroupActivitiesForRound,
  parseGroupNumber,
} from "@/lib/groups/wcif-schedule";

export function buildAssignmentExportRows(
  wcif: WCIF,
  roundActivityCode: string,
): Record<string, string | number | boolean | null>[] {
  const groups = getGroupActivitiesForRound(wcif, roundActivityCode);
  const groupIds = new Set(groups.map((g) => g.activity.id));

  const rows: Record<string, string | number | boolean | null>[] = [];

  for (const person of wcif.persons) {
    for (const assignment of person.assignments ?? []) {
      if (!groupIds.has(assignment.activityId)) continue;
      const located = findActivityById(wcif, assignment.activityId);
      if (!located) continue;
      rows.push({
        name: person.name,
        wcaId: person.wcaId,
        registrantId: person.registrantId,
        wcaUserId: person.wcaUserId,
        round: roundActivityCode,
        group: parseGroupNumber(located.activity.activityCode),
        room: located.roomName,
        roomId: located.roomId,
        activityId: assignment.activityId,
        assignmentCode: assignment.assignmentCode,
        station: assignment.stationNumber,
      });
    }
  }

  return rows.sort((a, b) => {
    const g = Number(a.group ?? 0) - Number(b.group ?? 0);
    if (g !== 0) return g;
    return String(a.name).localeCompare(String(b.name), "es");
  });
}

export function exportAssignmentsCsv(
  wcif: WCIF,
  roundActivityCode: string,
  competitionId: string,
): void {
  const rows = buildAssignmentExportRows(wcif, roundActivityCode);
  exportRowsToCsv(rows, {
    filename: `${competitionId}-${roundActivityCode}-assignments`,
    columns: [
      "name",
      "wcaId",
      "registrantId",
      "wcaUserId",
      "round",
      "group",
      "room",
      "roomId",
      "activityId",
      "assignmentCode",
      "station",
    ],
  });
}

export function exportDraftJson(wcif: WCIF, competitionId: string): void {
  const payload = {
    formatVersion: wcif.formatVersion ?? "1.0",
    id: wcif.id,
    name: wcif.name,
    schedule: wcif.schedule,
    persons: wcif.persons.map((p) => ({
      name: p.name,
      wcaUserId: p.wcaUserId,
      wcaId: p.wcaId,
      registrantId: p.registrantId,
      assignments: p.assignments ?? [],
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${competitionId}-groups-draft.json`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
