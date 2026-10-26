import { describe, expect, it } from "vitest";
import type { PersonResultsByEventGroup } from "./queries";
import {
  buildSessionPoints,
  summarizeSessionPoints,
} from "./results-chart-points";

function group(
  rows: {
    competitionName: string;
    competitionStartDate: string;
    roundTypeId: string;
    solves: number[];
  }[],
): PersonResultsByEventGroup {
  return {
    eventId: "333",
    eventName: "3x3x3 Cube",
    eventRank: 10,
    results: rows.map((row) => ({ eventId: "333", ...row })),
  } as unknown as PersonResultsByEventGroup;
}

describe("buildSessionPoints", () => {
  it("orders attempts chronologically, finals after first rounds, and skips DNS", () => {
    const points = buildSessionPoints(
      group([
        {
          competitionName: "Later Open",
          competitionStartDate: "2024-05-01",
          roundTypeId: "f",
          solves: [900, -2, 950],
        },
        {
          competitionName: "Early Open",
          competitionStartDate: "2024-01-01",
          roundTypeId: "f",
          solves: [1100],
        },
        {
          competitionName: "Early Open",
          competitionStartDate: "2024-01-01",
          roundTypeId: "1",
          solves: [1200, -1],
        },
      ]),
    );

    expect(
      points.map((p) => [p.solveNumber, p.competitionName, p.value]),
    ).toEqual([
      [1, "Early Open", 12],
      [2, "Early Open", null],
      [3, "Early Open", 11],
      [4, "Later Open", 9],
      [5, "Later Open", 9.5],
    ]);
    // Running PBs: 12, then 11, then 9.
    expect(points.map((p) => p.best)).toEqual([12, null, 11, 9, null]);
  });

  it("returns nothing without results", () => {
    expect(buildSessionPoints(null)).toEqual([]);
  });

  it("marks where the best Ao50 was reached", () => {
    const solves = Array.from({ length: 60 }, (_, i) => 1000 - i * 5);
    const points = buildSessionPoints(
      group([
        {
          competitionName: "Marathon",
          competitionStartDate: "2024-01-01",
          roundTypeId: "f",
          solves,
        },
      ]),
    );

    expect(points.findIndex((p) => p.bestAo50 !== null)).toBe(59);
    expect(points[48]?.ao50).toBeNull();
    expect(points[49]?.ao50).not.toBeNull();
  });
});

describe("summarizeSessionPoints", () => {
  it("summarizes best, worst, mean and solve counts", () => {
    const points = buildSessionPoints(
      group([
        {
          competitionName: "Open",
          competitionStartDate: "2024-01-01",
          roundTypeId: "f",
          solves: [1000, 1200, -1, 800],
        },
      ]),
    );

    expect(summarizeSessionPoints("333", points)?.global).toMatchObject({
      best: 8,
      worst: 12,
      mean: 10,
      totalTime: 30,
      count: 4,
      validCount: 3,
      ao12: null,
    });
  });

  it("is empty without points", () => {
    expect(summarizeSessionPoints("333", [])).toBeNull();
  });
});
