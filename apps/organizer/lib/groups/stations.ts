import type { WCIF } from "@/types/wcif";
import {
  deepCloneWcif,
  getGroupActivitiesForRound,
} from "@/lib/groups/wcif-schedule";

/**
 * Assign sequential station numbers to competitor assignments within each group.
 */
export function assignStationsForRound(
  wcif: WCIF,
  roundActivityCode: string,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const groups = getGroupActivitiesForRound(draft, roundActivityCode);

  for (const group of groups) {
    const competitors = draft.persons
      .map((person) => {
        const assignment = (person.assignments ?? []).find(
          (a) =>
            a.activityId === group.activity.id &&
            a.assignmentCode === "competitor",
        );
        return assignment ? { person, assignment } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => a.person.name.localeCompare(b.person.name, "es"));

    competitors.forEach((row, index) => {
      row.assignment.stationNumber = index + 1;
    });
  }

  return draft;
}

/** Clear station numbers for competitor assignments in a round. */
export function clearStationsForRound(
  wcif: WCIF,
  roundActivityCode: string,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const groupIds = new Set(
    getGroupActivitiesForRound(draft, roundActivityCode).map(
      (g) => g.activity.id,
    ),
  );

  for (const person of draft.persons) {
    for (const assignment of person.assignments ?? []) {
      if (
        groupIds.has(assignment.activityId) &&
        assignment.assignmentCode === "competitor"
      ) {
        assignment.stationNumber = null;
      }
    }
  }

  return draft;
}
