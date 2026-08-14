import type { WCIF } from "@/types/wcif";
import { detectConflicts } from "@/lib/groups/conflicts";
import {
  countCompetingInEvent,
  suggestedGroupsForRound,
} from "@/lib/groups/config";
import {
  findRoundActivities,
  getGroupActivitiesForRound,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";

export type RoundStatus =
  | "no_schedule"
  | "no_groups"
  | "no_assignments"
  | "ready"
  | "conflicts";

export type RoundOverviewRow = {
  roundId: string;
  eventId: string;
  roundNumber: number;
  competitors: number;
  groupCount: number;
  suggestedGroups: number;
  stations: number;
  status: RoundStatus;
  conflictCount: number;
};

const EVENT_NAMES: Record<string, string> = {
  "333": "3x3x3",
  "222": "2x2x2",
  "444": "4x4x4",
  "555": "5x5x5",
  "666": "6x6x6",
  "777": "7x7x7",
  "333bf": "3x3x3 a ciegas",
  "333fm": "3x3x3 FMC",
  "333oh": "3x3x3 OH",
  "333ft": "3x3x3 FT",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
  "444bf": "4x4x4 a ciegas",
  "555bf": "5x5x5 a ciegas",
  "333mbf": "3x3x3 Multi BLD",
};

export function eventDisplayName(eventId: string): string {
  return EVENT_NAMES[eventId] ?? eventId;
}

export function statusLabel(status: RoundStatus): string {
  switch (status) {
    case "no_schedule":
      return "Sin horario";
    case "no_groups":
      return "Sin grupos";
    case "no_assignments":
      return "Sin asignar";
    case "ready":
      return "Listo";
    case "conflicts":
      return "Conflictos";
  }
}

export function buildRoundsOverview(wcif: WCIF): Array<{
  eventId: string;
  eventName: string;
  rounds: RoundOverviewRow[];
}> {
  return wcif.events.map((event) => ({
    eventId: event.id,
    eventName: eventDisplayName(event.id),
    rounds: event.rounds.map((round, index) => {
      const parsed = parseRoundActivityCode(round.id);
      const roundNumber = parsed?.roundNumber ?? index + 1;
      const parents = findRoundActivities(wcif, round.id);
      const groups = getGroupActivitiesForRound(wcif, round.id);
      const competitors = countCompetingInEvent(wcif, event.id);
      const suggestion = suggestedGroupsForRound(wcif, round.id);
      const conflicts =
        groups.length > 0 ? detectConflicts(wcif, round.id) : [];

      let status: RoundStatus;
      if (parents.length === 0) {
        status = "no_schedule";
      } else if (groups.length === 0) {
        status = "no_groups";
      } else {
        const groupIds = new Set(groups.map((g) => g.activity.id));
        const assigned = wcif.persons.filter((p) =>
          (p.assignments ?? []).some(
            (a) =>
              groupIds.has(a.activityId) && a.assignmentCode === "competitor",
          ),
        ).length;
        if (assigned === 0) {
          status = "no_assignments";
        } else if (conflicts.length > 0) {
          status = "conflicts";
        } else {
          status = "ready";
        }
      }

      return {
        roundId: round.id,
        eventId: event.id,
        roundNumber,
        competitors,
        groupCount: groups.length,
        suggestedGroups: suggestion.groupCount,
        stations: suggestion.stations,
        status,
        conflictCount: conflicts.length,
      };
    }),
  }));
}

export type RoundsOverview = ReturnType<typeof buildRoundsOverview>;

export function deriveOverviewActions(overview: RoundsOverview): {
  needsGroups: boolean;
  needsAssign: boolean;
  hasAssignments: boolean;
  allReady: boolean;
} {
  const rounds = overview.flatMap((event) => event.rounds);
  const needsGroups = rounds.some((round) => round.status === "no_groups");
  const needsAssign = rounds.some(
    (round) =>
      round.status === "no_groups" || round.status === "no_assignments",
  );
  const hasAssignments = rounds.some(
    (round) => round.status === "ready" || round.status === "conflicts",
  );
  const allReady =
    rounds.length > 0 &&
    rounds.every(
      (round) => round.status === "ready" || round.status === "no_schedule",
    );

  return { needsGroups, needsAssign, hasAssignments, allReady };
}
