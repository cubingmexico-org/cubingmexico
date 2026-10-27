import { describe, expect, it } from "vitest";
import { buildTeamSolvePoints, teamSolveStats } from "./solve-points";
import type { TeamResultsByEventGroup } from "./queries";

type Row = TeamResultsByEventGroup["results"][number];

function row(values: Partial<Row>): Row {
  return {
    eventId: "333",
    personId: "2020AAAA01",
    personName: "Ana",
    competitionName: "Open",
    competitionStartDate: "2024-01-01",
    roundTypeId: "f",
    position: 1,
    best: 0,
    solves: [],
    isStateRecordSingle: false,
    stateSingleRecord: null,
    ...values,
  } as Row;
}

function group(results: Row[]): TeamResultsByEventGroup {
  return { eventId: "333", eventName: "3x3x3", eventRank: 10, results };
}

describe("buildTeamSolvePoints", () => {
  it("orders by date, then earlier rounds first, and marks each new team best", () => {
    const points = buildTeamSolvePoints(
      group([
        row({
          competitionStartDate: "2024-02-01",
          solves: [900, -1],
          best: 900,
          isStateRecordSingle: true,
        }),
        row({ roundTypeId: "f", solves: [1100, 1000], best: 1000 }),
        row({ roundTypeId: "1", solves: [1200, -2], best: 1200 }),
      ]),
    );

    expect(points.map((p) => [p.rawSolve, p.best, p.isStateRecord])).toEqual([
      [1200, 12, false],
      [1100, 11, false],
      [1000, 10, false],
      [900, 9, true],
      [-1, null, false],
    ]);
    expect(points.map((p) => p.solveNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("teamSolveStats", () => {
  it("summarizes the valid solves", () => {
    const points = buildTeamSolvePoints(
      group([row({ solves: [1000, 1200, -1], best: 1000 })]),
    );

    expect(teamSolveStats("333", points)).toMatchObject({
      best: 10,
      worst: 12,
      mean: 11,
      totalTime: 22,
      count: 3,
      validCount: 2,
      stateRecordCount: 1,
    });
  });

  it("returns null without points", () => {
    expect(teamSolveStats("333", [])).toBeNull();
  });
});
