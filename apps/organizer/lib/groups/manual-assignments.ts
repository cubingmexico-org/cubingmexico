/** Manual edits to one person's assignments and staff roles. */

import type { Assignment, Person, WCIF } from "@/types/wcif";
import { deepCloneWcif } from "@/lib/groups/wcif-schedule";

export function setPersonAssignment(
  wcif: WCIF,
  personKey: { wcaUserId: number },
  assignment: Assignment | null,
  scopeActivityIds?: Set<number>,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const person = draft.persons.find((p) => p.wcaUserId === personKey.wcaUserId);
  if (!person) return draft;

  let next = [...(person.assignments ?? [])];

  if (assignment) {
    if (scopeActivityIds) {
      next = next.filter(
        (a) =>
          !(
            scopeActivityIds.has(a.activityId) &&
            a.assignmentCode === assignment.assignmentCode
          ),
      );
    }
    next.push(assignment);
  }

  person.assignments = next;
  return draft;
}

export function removePersonAssignment(
  wcif: WCIF,
  personKey: { wcaUserId: number },
  activityId: number,
  assignmentCode?: string,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const person = draft.persons.find((p) => p.wcaUserId === personKey.wcaUserId);
  if (!person) return draft;
  person.assignments = (person.assignments ?? []).filter((a) => {
    if (a.activityId !== activityId) return true;
    if (assignmentCode && a.assignmentCode !== assignmentCode) return true;
    return false;
  });
  return draft;
}

export function setPersonStaffRoles(
  wcif: WCIF,
  wcaUserId: number,
  staffRoles: Array<
    "staff-judge" | "staff-scrambler" | "staff-runner" | "staff-other"
  >,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const person = draft.persons.find((p) => p.wcaUserId === wcaUserId);
  if (!person) return draft;
  const preserved = (person.roles ?? []).filter(
    (r) =>
      !r.startsWith("staff-") ||
      r === "staff-dataentry" ||
      r === "staff-announcer",
  );
  person.roles = [...preserved, ...staffRoles] as Person["roles"];
  return draft;
}
