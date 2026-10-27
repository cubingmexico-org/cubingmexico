import type { Assignment, Person } from "@/types/wcif";
import {
  type LocatedActivity,
  parseGroupNumber,
} from "@/lib/groups/wcif-schedule";

export const ASSIGNMENT_CODES = [
  { value: "competitor", label: "Competidor" },
  { value: "staff-judge", label: "Juez" },
  { value: "staff-scrambler", label: "Mezclador" },
  { value: "staff-runner", label: "Corredor" },
] as const;

export function codeLabel(code: string): string {
  return ASSIGNMENT_CODES.find((c) => c.value === code)?.label ?? code;
}

export type AssignmentRow = {
  person: Person;
  assignment: Assignment;
  groupNumber: number | null;
  roomName: string;
  activityName: string;
};

/** Everyone's assignments to the round's groups, by group, role and then name. */
export function assignmentRows(
  persons: Person[],
  groups: LocatedActivity[],
): AssignmentRow[] {
  const groupById = new Map(groups.map((g) => [g.activity.id, g]));
  const list: AssignmentRow[] = [];
  for (const person of persons) {
    for (const assignment of person.assignments ?? []) {
      const group = groupById.get(assignment.activityId);
      if (!group) continue;
      list.push({
        person,
        assignment,
        groupNumber: parseGroupNumber(group.activity.activityCode),
        roomName: group.roomName,
        activityName: group.activity.name,
      });
    }
  }
  return list.sort((a, b) => {
    const g = (a.groupNumber ?? 0) - (b.groupNumber ?? 0);
    if (g !== 0) return g;
    if (a.assignment.assignmentCode !== b.assignment.assignmentCode) {
      return a.assignment.assignmentCode.localeCompare(
        b.assignment.assignmentCode,
      );
    }
    return a.person.name.localeCompare(b.person.name, "es");
  });
}

/** Rows in `groupFilter` ("all" or a group number) whose name or WCA ID contains `search`. */
export function filterAssignmentRows(
  rows: AssignmentRow[],
  search: string,
  groupFilter: string,
): AssignmentRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (groupFilter !== "all" && String(row.groupNumber) !== groupFilter) {
      return false;
    }
    if (!q) return true;
    return (
      row.person.name.toLowerCase().includes(q) ||
      (row.person.wcaId?.toLowerCase().includes(q) ?? false)
    );
  });
}
