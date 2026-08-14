import type { Person, WCIF } from "@/types/wcif";
import {
  findActivityById,
  getGroupActivitiesForRound,
  timesOverlap,
} from "@/lib/groups/wcif-schedule";

export type AssignmentConflict = {
  type: "double_booking" | "overfull_group";
  message: string;
  personName?: string;
  activityId?: number;
};

function personLabel(person: Person): string {
  return person.name;
}

export function detectConflicts(
  wcif: WCIF,
  roundActivityCode: string,
): AssignmentConflict[] {
  const conflicts: AssignmentConflict[] = [];
  const groups = getGroupActivitiesForRound(wcif, roundActivityCode);
  if (groups.length === 0) return conflicts;

  const groupIds = new Set(groups.map((g) => g.activity.id));
  const eventId = roundActivityCode.replace(/-r\d+$/, "");

  const competingCount = wcif.persons.filter(
    (p) =>
      p.registration?.isCompeting &&
      (p.registration.eventIds ?? []).includes(eventId as never),
  ).length;
  const softTarget = Math.ceil(competingCount / groups.length);

  for (const group of groups) {
    const competitorCount = wcif.persons.filter((p) =>
      (p.assignments ?? []).some(
        (a) =>
          a.activityId === group.activity.id &&
          a.assignmentCode === "competitor",
      ),
    ).length;
    if (competitorCount > softTarget + 1 && softTarget > 0) {
      conflicts.push({
        type: "overfull_group",
        activityId: group.activity.id,
        message: `${group.activity.name}: ${competitorCount} competidores (objetivo ≈ ${softTarget})`,
      });
    }
  }

  for (const person of wcif.persons) {
    const assignments = (person.assignments ?? []).filter((a) =>
      groupIds.has(a.activityId),
    );
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const left = assignments[i];
        const right = assignments[j];
        if (!left || !right) continue;
        const a = findActivityById(wcif, left.activityId);
        const b = findActivityById(wcif, right.activityId);
        if (!a || !b) continue;
        if (
          timesOverlap(
            a.activity.startTime,
            a.activity.endTime,
            b.activity.startTime,
            b.activity.endTime,
          )
        ) {
          conflicts.push({
            type: "double_booking",
            personName: personLabel(person),
            message: `${personLabel(person)}: solapamiento entre ${a.activity.name} y ${b.activity.name}`,
          });
        }
      }
    }
  }

  return conflicts;
}
