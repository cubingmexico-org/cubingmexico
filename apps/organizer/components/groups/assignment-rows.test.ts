import { describe, expect, it } from "vitest";
import type { Person } from "@/types/wcif";
import type { LocatedActivity } from "@/lib/groups/wcif-schedule";
import {
  assignmentRows,
  codeLabel,
  filterAssignmentRows,
} from "./assignment-rows";

function group(id: number, number: number): LocatedActivity {
  return {
    activity: {
      id,
      name: `3x3x3 Cube, Round 1, Group ${number}`,
      activityCode: `333-r1-g${number}`,
    },
    roomName: "Principal",
  } as unknown as LocatedActivity;
}

function person(
  wcaUserId: number,
  name: string,
  wcaId: string | null,
  assignments: [activityId: number, code: string][],
): Person {
  return {
    wcaUserId,
    name,
    wcaId,
    assignments: assignments.map(([activityId, assignmentCode]) => ({
      activityId,
      assignmentCode,
      stationNumber: null,
    })),
  } as unknown as Person;
}

const groups = [group(10, 1), group(11, 2)];
const persons = [
  person(1, "Zoe", "2019ZOEE01", [
    [11, "competitor"],
    [10, "staff-judge"],
  ]),
  person(2, "Álvaro", null, [[11, "competitor"]]),
  person(3, "Bruno", "2020BRUN01", [
    [10, "competitor"],
    [99, "competitor"],
  ]),
];

describe("assignmentRows", () => {
  it("lists only the round's groups, by group, role and name", () => {
    expect(
      assignmentRows(persons, groups).map((row) => [
        row.groupNumber,
        row.assignment.assignmentCode,
        row.person.name,
      ]),
    ).toEqual([
      [1, "competitor", "Bruno"],
      [1, "staff-judge", "Zoe"],
      [2, "competitor", "Álvaro"],
      [2, "competitor", "Zoe"],
    ]);
  });
});

describe("filterAssignmentRows", () => {
  const rows = assignmentRows(persons, groups);
  const names = (filtered: typeof rows) => filtered.map((r) => r.person.name);

  it("filters by group number and by name or WCA ID", () => {
    expect(names(filterAssignmentRows(rows, "", "2"))).toEqual([
      "Álvaro",
      "Zoe",
    ]);
    expect(names(filterAssignmentRows(rows, " zoe ", "all"))).toEqual([
      "Zoe",
      "Zoe",
    ]);
    expect(names(filterAssignmentRows(rows, "2020brun", "all"))).toEqual([
      "Bruno",
    ]);
  });
});

describe("codeLabel", () => {
  it("names known roles and passes unknown codes through", () => {
    expect(codeLabel("staff-scrambler")).toBe("Mezclador");
    expect(codeLabel("staff-delegate")).toBe("staff-delegate");
  });
});
