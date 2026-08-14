import type { Assignment, EventId, Person, WCIF } from "@/types/wcif";
import {
  getActivityConfig,
  getCompetitionConfig,
  getRoomConfig,
  populateActivityConfigsForRound,
  roundHasActivityConfig,
  type CompetitionConfig,
  type CompetitorsSortingRule,
} from "@/lib/groups/config";
import { suggestedJudges } from "@/lib/groups/formulas";
import {
  createGroupsForRound,
  deepCloneWcif,
  findActivityById,
  findRoundActivities,
  getGroupActivitiesForRound,
  parseGroupNumber,
  parseRoundActivityCode,
  timesOverlap,
  type LocatedActivity,
} from "@/lib/groups/wcif-schedule";

const COMPETITOR = "competitor";
const STAFF_JUDGE = "staff-judge";
const STAFF_SCRAMBLER = "staff-scrambler";
const STAFF_RUNNER = "staff-runner";

const BALANCED_EVENTS = new Set([
  "333",
  "222",
  "333bf",
  "333oh",
  "333ft",
  "pyram",
  "skewb",
  "clock",
  "sq1",
]);

const BUSY_ROLES = new Set([
  "delegate",
  "trainee-delegate",
  "organizer",
  "staff-dataentry",
]);

function isDelegateOrOrganizer(person: Person): boolean {
  return (person.roles ?? []).some(
    (role) =>
      role === "delegate" ||
      role === "trainee-delegate" ||
      role === "organizer",
  );
}

function isBusyOfficial(person: Person): boolean {
  return (person.roles ?? []).some((role) => BUSY_ROLES.has(role));
}

function hasStaffRole(person: Person): boolean {
  return (person.roles ?? []).some((role) => role.startsWith("staff-"));
}

function hasSpecificStaffRole(person: Person, role: string): boolean {
  return (person.roles ?? []).includes(role as never);
}

function isNewcomer(person: Person): boolean {
  return !person.wcaId;
}

function competitionCountryIso2(wcif: WCIF): string | null {
  return wcif.schedule.venues[0]?.countryIso2 ?? null;
}

function isForeigner(wcif: WCIF, person: Person): boolean {
  const iso = competitionCountryIso2(wcif);
  if (!iso) return false;
  return person.countryIso2 !== iso;
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

function staffAssignmentCount(person: Person): number {
  return (person.assignments ?? []).filter(
    (a) => a.assignmentCode !== COMPETITOR,
  ).length;
}

function seedRank(person: Person, eventId: string, wcif: WCIF): number {
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

function bestAverageAndSingle(
  person: Person,
  eventId: string,
): [number, number] {
  const avg =
    (person.personalBests ?? []).find(
      (b) => b.eventId === eventId && b.type === "average",
    )?.best ?? Number.MAX_SAFE_INTEGER;
  const single =
    (person.personalBests ?? []).find(
      (b) => b.eventId === eventId && b.type === "single",
    )?.best ?? Number.MAX_SAFE_INTEGER;
  if (["333bf", "444bf", "555bf", "333mbf"].includes(eventId)) {
    return [single, avg];
  }
  return [avg, single];
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

function sortCompetitorsForRound(
  competitors: Person[],
  eventId: string,
  wcif: WCIF,
  roundActivityCode: string,
  rule: CompetitorsSortingRule,
): Person[] {
  const parsed = parseRoundActivityCode(roundActivityCode);
  const isFirstRound = (parsed?.roundNumber ?? 1) === 1;
  const byRanks = [...competitors].sort((a, b) =>
    sortBySeedThenName(a, b, eventId, wcif),
  );

  if (!isFirstRound) return byRanks;

  if (rule === "ranks") return byRanks;

  if (rule === "balanced" && BALANCED_EVENTS.has(eventId)) {
    return byRanks;
  }

  if (rule === "balanced" || rule === "symmetric") {
    const groupCount = Math.max(
      1,
      getGroupActivitiesForRound(wcif, roundActivityCode).length,
    );
    return [...byRanks].sort((a, b) => {
      const ia = byRanks.indexOf(a);
      const ib = byRanks.indexOf(b);
      const sa = groupCount - ((byRanks.length - ia - 1) % groupCount);
      const sb = groupCount - ((byRanks.length - ib - 1) % groupCount);
      if (sa !== sb) return sa - sb;
      return ia - ib;
    });
  }

  if (rule === "name-optimised") {
    const byName = new Map<string, Person[]>();
    for (const person of byRanks) {
      const first = person.name.split(/\s+/)[0] ?? person.name;
      const list = byName.get(first) ?? [];
      list.push(person);
      byName.set(first, list);
    }
    const sets = [...byName.values()].sort((a, b) => a.length - b.length);
    let competitorsAcc: Person[] = [];
    for (const sameName of sets) {
      if (competitorsAcc.length === 0) {
        competitorsAcc = [...sameName];
        continue;
      }
      const chunkSize = Math.ceil(
        competitorsAcc.length / Math.max(sameName.length, 1),
      );
      const chunks: Person[][] = [];
      for (let i = 0; i < competitorsAcc.length; i += chunkSize) {
        chunks.push(competitorsAcc.slice(i, i + chunkSize));
      }
      const next: Person[] = [];
      for (let i = 0; i < Math.max(chunks.length, sameName.length); i++) {
        if (chunks[i]) next.push(...chunks[i]!);
        if (sameName[i]) next.push(sameName[i]!);
      }
      competitorsAcc = next;
    }
    return competitorsAcc;
  }

  return byRanks;
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

function availableDuring(
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

function addAssignment(person: Person, assignment: Assignment): void {
  person.assignments = [...(person.assignments ?? []), assignment];
}

function parentForGroup(
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

function assignStationsInRound(
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

function assignStaffTasksForRound(
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
