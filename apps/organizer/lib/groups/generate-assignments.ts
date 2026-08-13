import type { Assignment, EventId, Person, WCIF } from "@/types/wcif";
import {
  deepCloneWcif,
  findActivityById,
  getGroupActivitiesForRound,
  parseGroupNumber,
  timesOverlap,
  type LocatedActivity,
} from "@/lib/groups/wcif-schedule";

const COMPETITOR = "competitor";
const STAFF_JUDGE = "staff-judge";

function isDelegateOrOrganizer(person: Person): boolean {
  return (person.roles ?? []).some(
    (role) =>
      role === "delegate" ||
      role === "trainee-delegate" ||
      role === "organizer",
  );
}

function hasStaffRole(person: Person): boolean {
  return (person.roles ?? []).some((role) => role.startsWith("staff-"));
}

function isInRound(person: Person, eventId: string): boolean {
  return (
    person.registration?.isCompeting === true &&
    (person.registration.eventIds ?? []).includes(eventId as EventId)
  );
}

function competitorAssignment(
  person: Person,
  groupIds: Set<number>,
): Assignment | undefined {
  return (person.assignments ?? []).find(
    (a) => a.assignmentCode === COMPETITOR && groupIds.has(a.activityId),
  );
}

function staffAssignmentsInRound(
  person: Person,
  groupIds: Set<number>,
): Assignment[] {
  return (person.assignments ?? []).filter(
    (a) => a.assignmentCode !== COMPETITOR && groupIds.has(a.activityId),
  );
}

function seedRank(person: Person, eventId: string, wcif: WCIF): number {
  // Prefer prior round result ranking when available (later rounds).
  if (person.registrantId != null) {
    const event = wcif.events.find((e) => e.id === eventId);
    if (event) {
      for (let i = event.rounds.length - 1; i >= 0; i--) {
        const roundResults = event.rounds[i]?.results;
        const result = roundResults?.find(
          (r) => r.personId === person.registrantId && r.ranking != null,
        );
        if (result?.ranking != null) return result.ranking;
      }
    }
  }

  const pb =
    (person.personalBests ?? []).find(
      (b) => b.eventId === eventId && b.type === "average",
    ) ??
    (person.personalBests ?? []).find(
      (b) => b.eventId === eventId && b.type === "single",
    );

  if (pb?.worldRanking != null) return pb.worldRanking;
  if (pb?.best != null && pb.best > 0) return pb.best;
  return Number.MAX_SAFE_INTEGER;
}

function sortBySeedThenName(
  a: Person,
  b: Person,
  eventId: string,
  wcif: WCIF,
): number {
  const seedDiff = seedRank(a, eventId, wcif) - seedRank(b, eventId, wcif);
  if (seedDiff !== 0) return seedDiff;
  return a.name.localeCompare(b.name, "es");
}

function groupSize(
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

function smallestGroup(
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

function groupsSortedByNumber(groups: LocatedActivity[]): LocatedActivity[] {
  return [...groups].sort((a, b) => {
    const ga = parseGroupNumber(a.activity.activityCode) ?? 0;
    const gb = parseGroupNumber(b.activity.activityCode) ?? 0;
    return ga - gb;
  });
}

function previousGroup(
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

function nextGroup(
  groups: LocatedActivity[],
  activityId: number,
): LocatedActivity | null {
  const sorted = groupsSortedByNumber(groups);
  const index = sorted.findIndex((g) => g.activity.id === activityId);
  if (index < 0 || sorted.length === 0) return null;
  return sorted[(index + 1) % sorted.length] ?? null;
}

function activityOverlapsStaff(
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

function addAssignment(person: Person, assignment: Assignment): void {
  person.assignments = [...(person.assignments ?? []), assignment];
}

/**
 * Generate assignments for a round's group activities.
 * Pipeline: staff competing → delegates/organizers → field → judges.
 */
export function generateAssignmentsForRound(
  wcif: WCIF,
  roundActivityCode: string,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const eventId = roundActivityCode.replace(/-r\d+$/, "");
  const groups = getGroupActivitiesForRound(draft, roundActivityCode);

  if (groups.length === 0) {
    throw new Error(
      `Crea grupos antes de generar asignaciones para ${roundActivityCode}`,
    );
  }

  const groupIds = new Set(groups.map((g) => g.activity.id));

  // Clear existing competitor + judge assignments for this round's groups;
  // keep other staff assignments that may have been set manually.
  for (const person of draft.persons) {
    person.assignments = (person.assignments ?? []).filter(
      (a) =>
        !groupIds.has(a.activityId) ||
        (a.assignmentCode !== COMPETITOR && a.assignmentCode !== STAFF_JUDGE),
    );
  }

  const competing = draft.persons.filter((p) => isInRound(p, eventId));

  // 1. Competing for staff (avoid conflict with staff activity times)
  const staffNeedingCompete = competing.filter(
    (p) =>
      hasStaffRole(p) &&
      !isDelegateOrOrganizer(p) &&
      !competitorAssignment(p, groupIds) &&
      staffAssignmentsInRound(p, groupIds).length > 0,
  );

  for (const person of staffNeedingCompete) {
    const staff = staffAssignmentsInRound(person, groupIds);
    const earliest = [...staff].sort((a, b) => {
      const la = findActivityById(draft, a.activityId);
      const lb = findActivityById(draft, b.activityId);
      return (
        new Date(la?.activity.startTime ?? 0).getTime() -
        new Date(lb?.activity.startTime ?? 0).getTime()
      );
    })[0];
    if (!earliest) continue;

    let candidate = previousGroup(groups, earliest.activityId);
    let guard = groups.length;
    while (
      candidate &&
      activityOverlapsStaff(person, candidate, draft, groupIds) &&
      guard-- > 0
    ) {
      candidate = previousGroup(groups, candidate.activity.id);
    }
    if (candidate) {
      addAssignment(person, {
        activityId: candidate.activity.id,
        stationNumber: null,
        assignmentCode: COMPETITOR,
      });
    }
  }

  // Also place staff without existing staff assignments but with staff role
  // into earliest available non-conflicting group later via field fill — skip here.

  // 2. Delegates / organizers → later groups first
  const keyStaff = competing.filter(
    (p) => isDelegateOrOrganizer(p) && !competitorAssignment(p, groupIds),
  );
  const laterFirst = [...groupsSortedByNumber(groups)].reverse();
  let keyIndex = 0;
  for (const person of keyStaff) {
    const group = laterFirst[keyIndex % laterFirst.length];
    keyIndex++;
    if (!group) continue;
    addAssignment(person, {
      activityId: group.activity.id,
      stationNumber: null,
      assignmentCode: COMPETITOR,
    });
  }

  // 3. Everyone else — seed by results / PBs, fill smallest group
  const remaining = competing
    .filter((p) => !competitorAssignment(p, groupIds))
    .sort((a, b) => sortBySeedThenName(a, b, eventId, draft));

  for (const person of remaining) {
    const group = smallestGroup(groups, draft.persons);
    addAssignment(person, {
      activityId: group.activity.id,
      stationNumber: null,
      assignmentCode: COMPETITOR,
    });
  }

  // 4. Judges from competing (next group); skip single-group rounds
  if (groups.length > 1) {
    const judges = competing.filter(
      (p) =>
        !isDelegateOrOrganizer(p) &&
        staffAssignmentsInRound(p, groupIds).length === 0,
    );

    for (const person of judges) {
      const compete = competitorAssignment(person, groupIds);
      if (!compete) continue;
      const judgeGroup = nextGroup(groups, compete.activityId);
      if (!judgeGroup) continue;
      if (judgeGroup.activity.id === compete.activityId) continue;
      addAssignment(person, {
        activityId: judgeGroup.activity.id,
        stationNumber: null,
        assignmentCode: STAFF_JUDGE,
      });
    }
  }

  return draft;
}

export function setPersonAssignment(
  wcif: WCIF,
  personKey: { wcaUserId: number },
  assignment: Assignment | null,
  /** When replacing, drop existing assignments with this code on the same activity set */
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
