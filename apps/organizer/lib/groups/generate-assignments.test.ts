import { describe, expect, it } from "vitest";
import type { Activity, EventId, Person, Role, WCIF } from "@/types/wcif";
import {
  generateAssignmentsForRound,
  removePersonAssignment,
  roundsMissingCompetitorAssignments,
  setPersonAssignment,
  setPersonStaffRoles,
} from "./generate-assignments";

const ROUND = "333-r1";
const GROUP_1 = 2;
const GROUP_2 = 3;

function activity(
  id: number,
  activityCode: string,
  startTime: string,
  endTime: string,
  childActivities: Activity[] = [],
): Activity {
  return {
    id,
    name: activityCode,
    activityCode,
    startTime,
    endTime,
    childActivities,
  };
}

function person(
  wcaUserId: number,
  name: string,
  options: {
    eventIds?: EventId[];
    isCompeting?: boolean;
    roles?: Role[];
  } = {},
): Person {
  const { eventIds = ["333"], isCompeting = true, roles = [] } = options;
  return {
    name,
    wcaUserId,
    wcaId: `2020TEST${String(wcaUserId).padStart(2, "0")}`,
    registrantId: wcaUserId,
    countryIso2: "MX",
    gender: null,
    registration: {
      wcaRegistrationId: wcaUserId,
      eventIds,
      status: "accepted",
      isCompeting,
    },
    avatar: null,
    roles,
    assignments: [],
    personalBests: [],
    extensions: [],
  };
}

function makeWcif(withGroups = true): WCIF {
  const groups = withGroups
    ? [
        activity(
          GROUP_1,
          `${ROUND}-g1`,
          "2025-03-15T16:00:00Z",
          "2025-03-15T16:30:00Z",
        ),
        activity(
          GROUP_2,
          `${ROUND}-g2`,
          "2025-03-15T16:30:00Z",
          "2025-03-15T17:00:00Z",
        ),
      ]
    : [];

  return {
    formatVersion: "1.0",
    id: "TestOpen2025",
    name: "Test Open 2025",
    competitorLimit: null,
    extensions: [],
    schedule: {
      startDate: "2025-03-15",
      numberOfDays: 1,
      venues: [
        {
          id: 1,
          name: "Venue",
          latitudeMicrodegrees: 0,
          longitudeMicrodegrees: 0,
          countryIso2: "MX",
          timezone: "America/Mexico_City",
          rooms: [
            {
              id: 1,
              name: "Main",
              color: "#000000",
              activities: [
                activity(
                  1,
                  ROUND,
                  "2025-03-15T16:00:00Z",
                  "2025-03-15T17:00:00Z",
                  groups,
                ),
                activity(
                  10,
                  "333fm-r1",
                  "2025-03-15T18:00:00Z",
                  "2025-03-15T19:00:00Z",
                ),
              ],
            },
          ],
        },
      ],
    },
    events: [
      {
        id: "333",
        rounds: [round(ROUND)],
        extensions: [],
        qualification: null,
      },
      {
        id: "333fm",
        rounds: [round("333fm-r1")],
        extensions: [],
        qualification: null,
      },
      {
        id: "222",
        rounds: [round("222-r1")],
        extensions: [],
        qualification: null,
      },
    ],
    persons: [
      person(1, "Ana"),
      person(2, "Beto"),
      person(3, "Carla"),
      person(4, "Diego"),
      person(5, "Elena"),
      person(6, "Fernando"),
      person(7, "Delegada", { roles: ["delegate"] }),
      person(8, "Visitante", { eventIds: [], isCompeting: false }),
    ],
  };
}

function round(id: string): WCIF["events"][number]["rounds"][number] {
  return {
    id,
    format: "a",
    timeLimit: null,
    cutoff: null,
    participationRuleset: null,
    linkedRounds: null,
    scrambleSetCount: 1,
    results: [],
    extensions: [],
  };
}

function competitorGroups(wcif: WCIF): Map<number, number[]> {
  const byPerson = new Map<number, number[]>();
  for (const p of wcif.persons) {
    byPerson.set(
      p.wcaUserId,
      p.assignments
        .filter((a) => a.assignmentCode === "competitor")
        .map((a) => a.activityId),
    );
  }
  return byPerson;
}

function byId(wcif: WCIF, wcaUserId: number): Person {
  const found = wcif.persons.find((p) => p.wcaUserId === wcaUserId);
  if (!found) throw new Error(`No person ${wcaUserId}`);
  return found;
}

describe("generateAssignmentsForRound", () => {
  it("throws when the round has no groups", () => {
    expect(() => generateAssignmentsForRound(makeWcif(false), ROUND)).toThrow(
      /Crea grupos/,
    );
  });

  it("gives each competitor exactly one group and non-competitors none", () => {
    const result = generateAssignmentsForRound(makeWcif(), ROUND);
    const groups = competitorGroups(result);

    for (const id of [1, 2, 3, 4, 5, 6, 7]) {
      expect(groups.get(id)).toHaveLength(1);
    }
    expect(groups.get(8)).toEqual([]);
  });

  it("keeps group sizes within one of each other", () => {
    const result = generateAssignmentsForRound(makeWcif(), ROUND);
    const all = [...competitorGroups(result).values()].flat();
    const size1 = all.filter((id) => id === GROUP_1).length;
    const size2 = all.filter((id) => id === GROUP_2).length;

    expect(size1 + size2).toBe(7);
    expect(Math.abs(size1 - size2)).toBeLessThanOrEqual(1);
  });

  it("puts delegates in the last group", () => {
    const result = generateAssignmentsForRound(makeWcif(), ROUND);
    expect(competitorGroups(result).get(7)).toEqual([GROUP_2]);
  });

  it("replaces the round's previous assignments when run again", () => {
    const once = generateAssignmentsForRound(makeWcif(), ROUND);
    const twice = generateAssignmentsForRound(once, ROUND);

    const count = (wcif: WCIF) =>
      wcif.persons.reduce((sum, p) => sum + p.assignments.length, 0);
    expect(count(twice)).toBe(count(once));
    for (const groups of competitorGroups(twice).values()) {
      expect(groups.length).toBeLessThanOrEqual(1);
    }
  });

  it("does not mutate the input", () => {
    const wcif = makeWcif();
    const before = structuredClone(wcif);
    generateAssignmentsForRound(wcif, ROUND);
    expect(wcif).toEqual(before);
  });

  it("has competitors judge the other group when staff tasks are off", () => {
    const result = generateAssignmentsForRound(makeWcif(), ROUND, {
      includeStaffTasks: false,
    });

    for (const id of [1, 2, 3, 4, 5, 6]) {
      const p = byId(result, id);
      const competes = p.assignments.find(
        (a) => a.assignmentCode === "competitor",
      );
      const judges = p.assignments.filter(
        (a) => a.assignmentCode === "staff-judge",
      );
      expect(judges).toHaveLength(1);
      expect(judges[0]?.activityId).not.toBe(competes?.activityId);
    }

    const delegateTasks = byId(result, 7).assignments.filter(
      (a) => a.assignmentCode !== "competitor",
    );
    expect(delegateTasks).toEqual([]);
  });
});

describe("roundsMissingCompetitorAssignments", () => {
  it("lists scheduled rounds until everyone has a group", () => {
    const wcif = makeWcif();
    // 333fm is skipped, and 222-r1 has no activity in the schedule.
    expect(roundsMissingCompetitorAssignments(wcif)).toEqual([ROUND]);
    expect(
      roundsMissingCompetitorAssignments(
        generateAssignmentsForRound(wcif, ROUND),
      ),
    ).toEqual([]);
  });

  it("lists a scheduled round that has no groups yet", () => {
    expect(roundsMissingCompetitorAssignments(makeWcif(false))).toEqual([
      ROUND,
    ]);
  });
});

describe("manual assignment edits", () => {
  const assigned = () => generateAssignmentsForRound(makeWcif(), ROUND);

  it("moves a competitor within the scoped round", () => {
    const wcif = assigned();
    const current = competitorGroups(wcif).get(1)?.[0];
    const target = current === GROUP_1 ? GROUP_2 : GROUP_1;

    const result = setPersonAssignment(
      wcif,
      { wcaUserId: 1 },
      { activityId: target, stationNumber: null, assignmentCode: "competitor" },
      new Set([GROUP_1, GROUP_2]),
    );

    expect(competitorGroups(result).get(1)).toEqual([target]);
    expect(competitorGroups(wcif).get(1)).toEqual([current]);
  });

  it("removes only the assignment with the given code", () => {
    const wcif = generateAssignmentsForRound(makeWcif(), ROUND, {
      includeStaffTasks: false,
    });
    const judge = byId(wcif, 1).assignments.find(
      (a) => a.assignmentCode === "staff-judge",
    );
    expect(judge).toBeDefined();

    const result = removePersonAssignment(
      wcif,
      { wcaUserId: 1 },
      judge!.activityId,
      "staff-judge",
    );
    const codes = byId(result, 1).assignments.map((a) => a.assignmentCode);
    expect(codes).toEqual(["competitor"]);
  });

  it("replaces staff roles but keeps data entry and non-staff roles", () => {
    const wcif = makeWcif();
    byId(wcif, 2).roles = ["staff-dataentry", "staff-judge", "delegate"];

    const result = setPersonStaffRoles(wcif, 2, ["staff-runner"]);
    expect(byId(result, 2).roles).toEqual([
      "staff-dataentry",
      "delegate",
      "staff-runner",
    ]);
  });
});
