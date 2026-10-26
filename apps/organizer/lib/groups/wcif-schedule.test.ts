import { describe, expect, it } from "vitest";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import {
  clearGroupAssignments,
  clearRoundAssignments,
  createGroupsForRound,
  findActivityById,
  getGroupActivitiesForRound,
  listAllActivitiesFlat,
  maxActivityId,
  parseGroupNumber,
  parseRoundActivityCode,
  timesOverlap,
} from "./wcif-schedule";

function assignmentIds(wcif: ReturnType<typeof makePrintablesWcif>) {
  return wcif.persons.flatMap((p) => p.assignments.map((a) => a.activityId));
}

describe("activity codes", () => {
  it("parses round and group codes", () => {
    expect(parseRoundActivityCode("333bf-r2")).toEqual({
      eventId: "333bf",
      roundNumber: 2,
    });
    expect(parseRoundActivityCode("other-lunch")).toBeNull();
    expect(parseGroupNumber("333-r1-g12")).toBe(12);
    expect(parseGroupNumber("333-r1")).toBeNull();
  });
});

describe("schedule lookups", () => {
  it("finds groups in order and activities by id", () => {
    const wcif = makePrintablesWcif();

    expect(
      getGroupActivitiesForRound(wcif, "333-r1").map(
        (g) => g.activity.activityCode,
      ),
    ).toEqual(["333-r1-g1", "333-r1-g2"]);
    expect(findActivityById(wcif, 11)).toMatchObject({
      roomName: "Sala Principal",
      activity: { activityCode: "333bf-r1-g1" },
    });
    expect(findActivityById(wcif, 999)).toBeNull();
    expect(maxActivityId(wcif)).toBe(11);
    expect(listAllActivitiesFlat(wcif)).toHaveLength(5);
  });

  it("detects overlapping time windows", () => {
    expect(
      timesOverlap(
        "2025-03-15T16:00:00Z",
        "2025-03-15T16:30:00Z",
        "2025-03-15T16:29:00Z",
        "2025-03-15T17:00:00Z",
      ),
    ).toBe(true);
    expect(
      timesOverlap(
        "2025-03-15T16:00:00Z",
        "2025-03-15T16:30:00Z",
        "2025-03-15T16:30:00Z",
        "2025-03-15T17:00:00Z",
      ),
    ).toBe(false);
  });
});

describe("group changes", () => {
  it("replaces a round's groups, splits its time window and drops their assignments", () => {
    const wcif = makePrintablesWcif();
    const updated = createGroupsForRound(wcif, "333-r1", {
      spreadAcrossStages: true,
      groupCount: 3,
    });

    const groups = getGroupActivitiesForRound(updated, "333-r1").map(
      (g) => g.activity,
    );
    expect(groups.map((g) => [g.id, g.activityCode, g.startTime])).toEqual([
      [12, "333-r1-g1", "2025-03-15T16:00:00.000Z"],
      [13, "333-r1-g2", "2025-03-15T16:20:00.000Z"],
      [14, "333-r1-g3", "2025-03-15T16:40:00.000Z"],
    ]);
    expect(assignmentIds(updated)).toEqual([11, 11]);
    // The input draft is left untouched.
    expect(assignmentIds(wcif)).toHaveLength(10);
  });

  it("refuses rounds that aren't on the schedule", () => {
    expect(() =>
      createGroupsForRound(makePrintablesWcif(), "444-r1", {
        spreadAcrossStages: true,
        groupCount: 2,
      }),
    ).toThrow("No hay actividades de ronda para 444-r1");
  });

  it("clears a round's or a group's assignments only", () => {
    const wcif = makePrintablesWcif();

    expect(
      assignmentIds(clearRoundAssignments(wcif, "333bf-r1")),
    ).not.toContain(11);
    expect(assignmentIds(clearRoundAssignments(wcif, "333bf-r1"))).toHaveLength(
      8,
    );
    expect(assignmentIds(clearGroupAssignments(wcif, 2))).toEqual([
      3, 11, 3, 3, 11, 3,
    ]);
  });
});
