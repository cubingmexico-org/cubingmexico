import { describe, expect, it } from "vitest";
import { computePrStreaks, type PrStreakResultRow } from "./pr-streaks-compute";

function row(
  competitionId: string,
  day: number,
  eventId: string,
  best: number,
  average = 0,
): PrStreakResultRow {
  const date = new Date(Date.UTC(2024, 0, day));
  return {
    competitionId,
    competitionName: `Comp ${competitionId}`,
    startDate: date,
    endDate: date,
    eventId,
    best,
    average,
  };
}

const ids = (streak: { competitionId: string }[]) =>
  streak.map((c) => c.competitionId);

describe("computePrStreaks", () => {
  it("returns empty streaks without results", () => {
    expect(computePrStreaks([])).toEqual({
      currentStreak: [],
      longestStreak: [],
    });
  });

  it("counts a first result, an equal result and an improvement as PRs", () => {
    const streaks = computePrStreaks([
      row("A", 1, "333", 1000),
      row("B", 2, "333", 1000),
      row("C", 3, "333", 900),
    ]);

    expect(ids(streaks.currentStreak)).toEqual(["A", "B", "C"]);
    expect(ids(streaks.longestStreak)).toEqual(["A", "B", "C"]);
    expect(streaks.currentStreak[0]).toEqual({
      competitionId: "A",
      competitionName: "Comp A",
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-01-01T00:00:00.000Z",
    });
  });

  it("breaks the streak on a competition without a PR and keeps the longest", () => {
    const streaks = computePrStreaks([
      row("A", 1, "333", 1000),
      row("B", 2, "333", 900),
      row("C", 3, "333", 950),
      row("D", 4, "333", 800),
    ]);

    expect(ids(streaks.longestStreak)).toEqual(["A", "B"]);
    expect(ids(streaks.currentStreak)).toEqual(["D"]);
  });

  it("ignores DNF and DNS, and counts averages and new events", () => {
    const streaks = computePrStreaks([
      row("A", 1, "333", 1000, 1200),
      row("B", 2, "333", -1, 1100),
      row("C", 3, "333", 0, 0),
      row("D", 4, "333", 1100),
      row("D", 4, "222", 300),
    ]);

    expect(ids(streaks.longestStreak)).toEqual(["A", "B"]);
    expect(ids(streaks.currentStreak)).toEqual(["D"]);
  });
});
