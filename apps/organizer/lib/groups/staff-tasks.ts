/** Judge, scrambler and runner tasks for a round's groups. */

import type { EventId, Person, WCIF } from "@/types/wcif";
import {
  type CompetitionConfig,
  getActivityConfig,
  getRoomConfig,
} from "@/lib/groups/config";
import { suggestedJudges } from "@/lib/groups/formulas";
import { getGroupActivitiesForRound } from "@/lib/groups/wcif-schedule";
import {
  bestAverageAndSingle,
  COMPETITOR,
  hasSpecificStaffRole,
  hasStaffRole,
  isBusyOfficial,
  isForeigner,
  isNewcomer,
  STAFF_JUDGE,
  STAFF_RUNNER,
  STAFF_SCRAMBLER,
  staffAssignmentCount,
  staffAssignmentsInRound,
} from "@/lib/groups/assignment-people";
import {
  addAssignment,
  availableDuring,
  groupSize,
  nextGroup,
  parentForGroup,
} from "@/lib/groups/assignment-groups";

export function assignStaffTasksForRound(
  draft: WCIF,
  roundActivityCode: string,
  eventId: string,
  config: CompetitionConfig,
): void {
  const groups = getGroupActivitiesForRound(draft, roundActivityCode);
  if (groups.length === 0) return;

  const accepted = draft.persons.filter(
    (p) =>
      p.registration?.status === "accepted" ||
      p.registration?.isCompeting === true ||
      (p.roles ?? []).length > 0,
  );

  for (const group of groups) {
    const parent = parentForGroup(draft, group, roundActivityCode);
    if (!parent) continue;
    const activityConfig = getActivityConfig(parent.activity);
    const room = draft.schedule.venues
      .flatMap((v) => v.rooms)
      .find((r) => r.id === group.roomId);
    const stations = room ? getRoomConfig(room).stations : 0;
    const groupCompetitors = groupSize(draft.persons, group.activity.id);

    const pickPeople = (
      code: string,
      needed: number,
      preferRole: string,
      extraFilter?: (p: Person) => boolean,
    ) => {
      if (needed <= 0) return;
      const available = accepted.filter(
        (person) =>
          !isBusyOfficial(person) &&
          availableDuring(draft, group, person) &&
          (!config.noTasksForNewcomers || !isNewcomer(person)) &&
          (!config.tasksForOwnEventsOnly ||
            (person.registration?.eventIds ?? []).includes(
              eventId as EventId,
            )) &&
          (extraFilter ? extraFilter(person) : true),
      );

      const staffPool = available
        .filter((p) => hasSpecificStaffRole(p, preferRole) || hasStaffRole(p))
        .sort((a, b) => {
          const roleDiff =
            (hasSpecificStaffRole(b, preferRole) ? 1 : 0) -
            (hasSpecificStaffRole(a, preferRole) ? 1 : 0);
          if (roleDiff !== 0) return roleDiff;
          return staffAssignmentCount(a) - staffAssignmentCount(b);
        });

      const others = available
        .filter((p) => !staffPool.includes(p))
        .sort((a, b) => {
          const taskDiff = staffAssignmentCount(a) - staffAssignmentCount(b);
          if (taskDiff !== 0) return taskDiff;
          const [aa, as] = bestAverageAndSingle(a, eventId);
          const [ba, bs] = bestAverageAndSingle(b, eventId);
          if (code === STAFF_SCRAMBLER) {
            if (aa !== ba) return aa - ba;
            return as - bs;
          }
          return (
            (a.registration?.eventIds?.length ?? 0) -
            (b.registration?.eventIds?.length ?? 0)
          );
        });

      const chosen = [...staffPool, ...others].slice(0, needed);
      for (const person of chosen) {
        addAssignment(person, {
          activityId: group.activity.id,
          stationNumber: null,
          assignmentCode: code,
        });
      }
    };

    pickPeople(STAFF_SCRAMBLER, activityConfig.scramblers, STAFF_SCRAMBLER);
    pickPeople(
      STAFF_RUNNER,
      activityConfig.runners,
      STAFF_RUNNER,
      (p) => !(config.noRunningForForeigners && isForeigner(draft, p)),
    );

    if (activityConfig.assignJudges && groups.length > 1) {
      const judgesNeeded = suggestedJudges(stations, groupCompetitors, true);
      // Prefer next-group competitors already placed (DD style) first
      const next = nextGroup(groups, group.activity.id);
      const fromNext =
        next != null
          ? draft.persons.filter(
              (p) =>
                !isBusyOfficial(p) &&
                availableDuring(draft, group, p) &&
                (p.assignments ?? []).some(
                  (a) =>
                    a.activityId === next.activity.id &&
                    a.assignmentCode === COMPETITOR,
                ) &&
                staffAssignmentsInRound(
                  p,
                  new Set(groups.map((g) => g.activity.id)),
                ).length === 0 &&
                (!config.noTasksForNewcomers || !isNewcomer(p)),
            )
          : [];

      const remaining = Math.max(0, judgesNeeded - fromNext.length);
      for (const person of fromNext.slice(0, judgesNeeded)) {
        addAssignment(person, {
          activityId: group.activity.id,
          stationNumber: null,
          assignmentCode: STAFF_JUDGE,
        });
      }
      if (remaining > 0) {
        pickPeople(STAFF_JUDGE, remaining, STAFF_JUDGE);
      }
    }
  }
}
