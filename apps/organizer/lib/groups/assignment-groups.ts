/** Group sizes and neighbours, availability checks and station numbers for assignment generation. */

import type { Assignment, Person, WCIF } from "@/types/wcif";
import type { CompetitionConfig } from "@/lib/groups/config";
import {
  findActivityById,
  findRoundActivities,
  getGroupActivitiesForRound,
  type LocatedActivity,
  parseGroupNumber,
  timesOverlap,
} from "@/lib/groups/wcif-schedule";
import {
  COMPETITOR,
  isInRound,
  sortBySeedThenName,
  staffAssignmentsInRound,
} from "@/lib/groups/assignment-people";

export function groupSize(
  persons: Person[],
  activityId: number,
  code: string = COMPETITOR,
): number {
  return persons.filter((p) =>
    (p.assignments ?? []).some(
      (a) => a.activityId === activityId && a.assignmentCode === code,
    ),
  ).length;
}

export function smallestGroup(
  groups: LocatedActivity[],
  persons: Person[],
): LocatedActivity {
  const sorted = [...groups].sort((a, b) => {
    const sizeDiff =
      groupSize(persons, a.activity.id) - groupSize(persons, b.activity.id);
    if (sizeDiff !== 0) return sizeDiff;
    return a.activity.id - b.activity.id;
  });
  const first = sorted[0];
  if (!first) {
    throw new Error("No hay grupos disponibles");
  }
  return first;
}

export function groupsSortedByNumber(
  groups: LocatedActivity[],
): LocatedActivity[] {
  return [...groups].sort((a, b) => {
    const ga = parseGroupNumber(a.activity.activityCode) ?? 0;
    const gb = parseGroupNumber(b.activity.activityCode) ?? 0;
    return ga - gb;
  });
}

export function previousGroup(
  groups: LocatedActivity[],
  activityId: number,
): LocatedActivity | null {
  const sorted = groupsSortedByNumber(groups);
  const index = sorted.findIndex((g) => g.activity.id === activityId);
  if (index < 0) return null;
  if (index === 0) {
    return sorted.length > 1 ? (sorted[sorted.length - 1] ?? null) : null;
  }
  return sorted[index - 1] ?? null;
}

export function nextGroup(
  groups: LocatedActivity[],
  activityId: number,
): LocatedActivity | null {
  const sorted = groupsSortedByNumber(groups);
  const index = sorted.findIndex((g) => g.activity.id === activityId);
  if (index < 0 || sorted.length === 0) return null;
  return sorted[(index + 1) % sorted.length] ?? null;
}

export function activityOverlapsStaff(
  person: Person,
  candidate: LocatedActivity,
  wcif: WCIF,
  groupIds: Set<number>,
): boolean {
  const staff = staffAssignmentsInRound(person, groupIds);
  for (const assignment of staff) {
    const located = findActivityById(wcif, assignment.activityId);
    if (!located) continue;
    if (
      timesOverlap(
        candidate.activity.startTime,
        candidate.activity.endTime,
        located.activity.startTime,
        located.activity.endTime,
      )
    ) {
      return true;
    }
  }
  return false;
}

export function availableDuring(
  wcif: WCIF,
  activity: LocatedActivity,
  person: Person,
): boolean {
  return !(person.assignments ?? []).some((assignment) => {
    const other = findActivityById(wcif, assignment.activityId);
    if (!other) return false;
    return timesOverlap(
      activity.activity.startTime,
      activity.activity.endTime,
      other.activity.startTime,
      other.activity.endTime,
    );
  });
}

export function addAssignment(person: Person, assignment: Assignment): void {
  person.assignments = [...(person.assignments ?? []), assignment];
}

export function parentForGroup(
  wcif: WCIF,
  group: LocatedActivity,
  roundActivityCode: string,
): LocatedActivity | null {
  const parents = findRoundActivities(wcif, roundActivityCode);
  return (
    parents.find(
      (p) =>
        p.roomId === group.roomId &&
        (p.activity.childActivities ?? []).some(
          (c) => c.id === group.activity.id,
        ),
    ) ?? null
  );
}

export function assignStationsInRound(
  draft: WCIF,
  roundActivityCode: string,
  eventId: string,
  config: CompetitionConfig,
): void {
  if (!config.printStations) return;
  const groups = getGroupActivitiesForRound(draft, roundActivityCode);
  const sortedCompetitors = [...draft.persons]
    .filter((p) => isInRound(p, eventId))
    .sort((a, b) => sortBySeedThenName(a, b, eventId, draft))
    .reverse();

  for (const group of groups) {
    const competitors = sortedCompetitors.filter((person) =>
      (person.assignments ?? []).some(
        (a) =>
          a.activityId === group.activity.id && a.assignmentCode === COMPETITOR,
      ),
    );
    competitors.forEach((person, index) => {
      const assignment = (person.assignments ?? []).find(
        (a) =>
          a.activityId === group.activity.id && a.assignmentCode === COMPETITOR,
      );
      if (assignment) assignment.stationNumber = index + 1;
    });
  }
}
