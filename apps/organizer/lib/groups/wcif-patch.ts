import type { Activity, Assignment, Person, WCIF } from "@/types/wcif";
import { deepCloneWcif } from "@/lib/groups/wcif-schedule";

function sanitizeAssignment(assignment: Assignment): Assignment {
  return {
    activityId: assignment.activityId,
    stationNumber:
      assignment.stationNumber === undefined ? null : assignment.stationNumber,
    assignmentCode: assignment.assignmentCode,
  };
}

function personKey(person: Pick<Person, "wcaUserId" | "registrantId">): string {
  if (person.registrantId != null) return `r:${person.registrantId}`;
  return `u:${person.wcaUserId}`;
}

function sanitizeActivity(activity: Activity): Activity {
  return {
    id: activity.id,
    name: activity.name,
    activityCode: activity.activityCode,
    startTime: activity.startTime,
    endTime: activity.endTime,
    childActivities: (activity.childActivities ?? []).map(sanitizeActivity),
    scrambleSetId: activity.scrambleSetId ?? null,
    ...(activity.extensions && activity.extensions.length > 0
      ? { extensions: activity.extensions }
      : {}),
  };
}

/**
 * Merge draft assignments + child activities onto an authorized WCIF base.
 * Returns a subset suitable for PUT check / PATCH.
 */
export function buildWcifPatchPayload(
  authorizedBase: WCIF,
  draft: WCIF,
): {
  id: string;
  persons: Person[];
  schedule: WCIF["schedule"];
} {
  const base = deepCloneWcif(authorizedBase);
  const draftByKey = new Map(
    draft.persons.map((p) => [personKey(p), p] as const),
  );

  for (const person of base.persons) {
    const fromDraft = draftByKey.get(personKey(person));
    if (!fromDraft) continue;
    person.assignments = (fromDraft.assignments ?? []).map(sanitizeAssignment);
  }

  // Also apply assignments for draft persons matched only by wcaUserId if keys differ
  const baseByUser = new Map(base.persons.map((p) => [p.wcaUserId, p]));
  for (const draftPerson of draft.persons) {
    const basePerson = baseByUser.get(draftPerson.wcaUserId);
    if (!basePerson) continue;
    // Prefer registrant-keyed merge above; overwrite if draft has assignments
    if ((draftPerson.assignments ?? []).length > 0) {
      basePerson.assignments = (draftPerson.assignments ?? []).map(
        sanitizeAssignment,
      );
    }
  }

  const draftParents = new Map<string, Activity>();
  for (const venue of draft.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        draftParents.set(`${room.id}:${activity.activityCode}`, activity);
        // Also key by activity id for robust match
        draftParents.set(`id:${activity.id}`, activity);
      }
    }
  }

  for (const venue of base.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        const fromDraft =
          draftParents.get(`id:${activity.id}`) ??
          draftParents.get(`${room.id}:${activity.activityCode}`);
        if (!fromDraft) continue;
        activity.childActivities = (fromDraft.childActivities ?? []).map(
          sanitizeActivity,
        );
      }
    }
  }

  return {
    id: base.id,
    persons: base.persons,
    schedule: base.schedule,
  };
}
