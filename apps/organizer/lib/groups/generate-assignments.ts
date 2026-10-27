import type { WCIF } from "@/types/wcif";
import {
  getActivityConfig,
  getCompetitionConfig,
  roundHasActivityConfig,
} from "@/lib/groups/config";
import { populateActivityConfigsForRound } from "@/lib/groups/config-suggestions";
import {
  createGroupsForRound,
  deepCloneWcif,
  findActivityById,
  findRoundActivities,
  getGroupActivitiesForRound,
} from "@/lib/groups/wcif-schedule";
import {
  COMPETITOR,
  competitorAssignment,
  hasStaffRole,
  isBusyOfficial,
  isDelegateOrOrganizer,
  isInRound,
  sortCompetitorsForRound,
  STAFF_JUDGE,
  STAFF_RUNNER,
  STAFF_SCRAMBLER,
  staffAssignmentsInRound,
} from "@/lib/groups/assignment-people";
import {
  activityOverlapsStaff,
  addAssignment,
  assignStationsInRound,
  groupsSortedByNumber,
  nextGroup,
  previousGroup,
  smallestGroup,
} from "@/lib/groups/assignment-groups";
import { assignStaffTasksForRound } from "@/lib/groups/staff-tasks";

/**
 * Generate assignments for a round's group activities.
 * Pipeline: staff competing → delegates/organizers → field → staff tasks.
 */
export function generateAssignmentsForRound(
  wcif: WCIF,
  roundActivityCode: string,
  options?: { includeStaffTasks?: boolean },
): WCIF {
  const includeStaffTasks = options?.includeStaffTasks !== false;
  const draft = deepCloneWcif(wcif);
  const config = getCompetitionConfig(draft);
  const eventId = roundActivityCode.replace(/-r\d+$/, "");
  const groups = getGroupActivitiesForRound(draft, roundActivityCode);

  if (groups.length === 0) {
    throw new Error(
      `Crea grupos antes de generar asignaciones para ${roundActivityCode}`,
    );
  }

  const groupIds = new Set(groups.map((g) => g.activity.id));

  for (const person of draft.persons) {
    person.assignments = (person.assignments ?? []).filter(
      (a) =>
        !groupIds.has(a.activityId) ||
        (a.assignmentCode !== COMPETITOR &&
          a.assignmentCode !== STAFF_JUDGE &&
          a.assignmentCode !== STAFF_SCRAMBLER &&
          a.assignmentCode !== STAFF_RUNNER),
    );
  }

  const competing = draft.persons.filter((p) => isInRound(p, eventId));

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

  const remaining = sortCompetitorsForRound(
    competing.filter((p) => !competitorAssignment(p, groupIds)),
    eventId,
    draft,
    roundActivityCode,
    config.competitorsSortingRule,
  );

  for (const person of remaining) {
    const group = smallestGroup(groups, draft.persons);
    addAssignment(person, {
      activityId: group.activity.id,
      stationNumber: null,
      assignmentCode: COMPETITOR,
    });
  }

  if (includeStaffTasks) {
    assignStaffTasksForRound(draft, roundActivityCode, eventId, config);
  } else if (groups.length > 1) {
    // Legacy next-group judges only when staff tasks disabled
    const judges = competing.filter(
      (p) =>
        !isBusyOfficial(p) && staffAssignmentsInRound(p, groupIds).length === 0,
    );
    for (const person of judges) {
      const compete = competitorAssignment(person, groupIds);
      if (!compete) continue;
      const judgeGroup = nextGroup(groups, compete.activityId);
      if (!judgeGroup || judgeGroup.activity.id === compete.activityId)
        continue;
      addAssignment(person, {
        activityId: judgeGroup.activity.id,
        stationNumber: null,
        assignmentCode: STAFF_JUDGE,
      });
    }
  }

  assignStationsInRound(draft, roundActivityCode, eventId, config);

  return draft;
}

export function roundsMissingCompetitorAssignments(wcif: WCIF): string[] {
  const missing: string[] = [];
  for (const event of wcif.events) {
    for (const round of event.rounds) {
      const parents = findRoundActivities(wcif, round.id);
      if (parents.length === 0) continue;
      // Skip FMC / MBLD attempt-distributed style if no group children expected
      if (event.id === "333fm" || event.id === "333mbf") continue;
      const groups = getGroupActivitiesForRound(wcif, round.id);
      if (groups.length === 0) {
        missing.push(round.id);
        continue;
      }
      const groupIds = new Set(groups.map((g) => g.activity.id));
      const competing = wcif.persons.filter((p) => isInRound(p, event.id));
      const assigned = competing.filter((p) =>
        competitorAssignment(p, groupIds),
      );
      if (assigned.length < competing.length) {
        missing.push(round.id);
      }
    }
  }
  return missing;
}

export type AssignAllResult = {
  wcif: WCIF;
  assignedRounds: string[];
  createdGroupsFor: string[];
  errors: Array<{ roundId: string; message: string }>;
};

/**
 * Create missing groups from station suggestions and assign all pending rounds.
 */
export function assignAllPendingRounds(wcif: WCIF): AssignAllResult {
  let draft = deepCloneWcif(wcif);
  const assignedRounds: string[] = [];
  const createdGroupsFor: string[] = [];
  const errors: AssignAllResult["errors"] = [];

  const pending = roundsMissingCompetitorAssignments(draft);
  // Prefer rounds with fewer groups first (more constrained)
  const sorted = [...pending].sort((a, b) => {
    const ga = getGroupActivitiesForRound(draft, a).length || 99;
    const gb = getGroupActivitiesForRound(draft, b).length || 99;
    return ga - gb;
  });

  for (const roundId of sorted) {
    try {
      let groups = getGroupActivitiesForRound(draft, roundId);
      if (groups.length === 0) {
        if (!roundHasActivityConfig(draft, roundId)) {
          draft = populateActivityConfigsForRound(draft, roundId);
        }
        const parents = findRoundActivities(draft, roundId);
        if (parents.length === 0) {
          errors.push({
            roundId,
            message: "Sin actividad en el horario",
          });
          continue;
        }
        const configs = parents.map((p) => getActivityConfig(p.activity));
        const allSame = configs.every((c) => c.groups === configs[0]?.groups);
        draft = createGroupsForRound(draft, roundId, {
          spreadAcrossStages: allSame,
          groupCount: configs[0]?.groups ?? 2,
          perRoomCounts: Object.fromEntries(
            parents.map((p, i) => [p.roomId, configs[i]?.groups ?? 2]),
          ),
          timeSplit: true,
        });
        createdGroupsFor.push(roundId);
        groups = getGroupActivitiesForRound(draft, roundId);
      }

      draft = generateAssignmentsForRound(draft, roundId, {
        includeStaffTasks: true,
      });
      assignedRounds.push(roundId);
    } catch (e) {
      errors.push({
        roundId,
        message: e instanceof Error ? e.message : "Error al asignar",
      });
    }
  }

  return { wcif: draft, assignedRounds, createdGroupsFor, errors };
}

export function createMissingGroupsForAllRounds(wcif: WCIF): {
  wcif: WCIF;
  created: string[];
} {
  let draft = deepCloneWcif(wcif);
  const created: string[] = [];
  for (const event of wcif.events) {
    if (event.id === "333fm" || event.id === "333mbf") continue;
    for (const round of event.rounds) {
      const parents = findRoundActivities(draft, round.id);
      if (parents.length === 0) continue;
      const groups = getGroupActivitiesForRound(draft, round.id);
      if (groups.length > 0) continue;
      if (!roundHasActivityConfig(draft, round.id)) {
        draft = populateActivityConfigsForRound(draft, round.id);
      }
      const parents2 = findRoundActivities(draft, round.id);
      const configs = parents2.map((p) => getActivityConfig(p.activity));
      const allSame = configs.every((c) => c.groups === configs[0]?.groups);
      draft = createGroupsForRound(draft, round.id, {
        spreadAcrossStages: allSame,
        groupCount: configs[0]?.groups ?? 2,
        perRoomCounts: Object.fromEntries(
          parents2.map((p, i) => [p.roomId, configs[i]?.groups ?? 2]),
        ),
        timeSplit: true,
      });
      created.push(round.id);
    }
  }
  return { wcif: draft, created };
}

export function clearAllRoundAssignments(wcif: WCIF): WCIF {
  const draft = deepCloneWcif(wcif);
  for (const event of draft.events) {
    for (const round of event.rounds) {
      const groupIds = new Set(
        getGroupActivitiesForRound(draft, round.id).map((g) => g.activity.id),
      );
      for (const person of draft.persons) {
        person.assignments = (person.assignments ?? []).filter(
          (a) => !groupIds.has(a.activityId),
        );
      }
    }
  }
  return draft;
}
