import type { EventId, WCIF } from "@/types/wcif";
import {
  deepCloneWcif,
  getGroupActivitiesForRound,
} from "@/lib/groups/wcif-schedule";

function seedRank(
  person: {
    registrantId: number | null;
    personalBests?: Array<{
      eventId: string;
      type: string;
      worldRanking: number | null;
      best: number;
    }>;
    name: string;
  },
  eventId: string,
  wcif: WCIF,
): number {
  if (person.registrantId != null) {
    const event = wcif.events.find((e) => e.id === eventId);
    if (event) {
      for (let i = event.rounds.length - 1; i >= 0; i--) {
        const result = event.rounds[i]?.results?.find(
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

/**
 * Assign sequential station numbers to competitor assignments within each group.
 * Ordered by seed (best last → station 1 for stronger when reversed elsewhere;
 * here best get lower stations via reverse of ranking sort).
 */
export function assignStationsForRound(
  wcif: WCIF,
  roundActivityCode: string,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const eventId = roundActivityCode.replace(/-r\d+$/, "") as EventId;
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
      .sort((a, b) => {
        const seedDiff =
          seedRank(a.person, eventId, draft) -
          seedRank(b.person, eventId, draft);
        if (seedDiff !== 0) return -seedDiff; // better (lower rank) → earlier station
        return a.person.name.localeCompare(b.person.name, "es");
      });

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
