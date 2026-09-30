import { describe, expect, it } from "vitest";
import {
  getRoundWinner,
  summarizeHeadToHead,
  type HeadToHeadRound,
} from "@/lib/head-to-head";

function round(
  overrides: Partial<HeadToHeadRound> & {
    aPos: number | null;
    bPos: number | null;
  },
): HeadToHeadRound {
  const { aPos, bPos, ...rest } = overrides;
  return {
    competitionId: "Comp2024",
    competitionName: "Comp 2024",
    date: "2024-01-01",
    eventId: "333",
    eventName: "3x3x3 Cube",
    eventRank: 10,
    roundTypeId: "f",
    a: { pos: aPos, best: 1000, average: 1200 },
    b: { pos: bPos, best: 1100, average: 1300 },
    ...rest,
  };
}

describe("getRoundWinner", () => {
  it("picks the lower position", () => {
    expect(getRoundWinner(round({ aPos: 1, bPos: 3 }))).toBe("a");
    expect(getRoundWinner(round({ aPos: 5, bPos: 2 }))).toBe("b");
  });

  it("treats equal positions as a tie", () => {
    expect(getRoundWinner(round({ aPos: 2, bPos: 2 }))).toBe("tie");
  });

  it("prefers a valid position over a missing one", () => {
    expect(getRoundWinner(round({ aPos: null, bPos: 4 }))).toBe("b");
    expect(getRoundWinner(round({ aPos: 4, bPos: 0 }))).toBe("a");
    expect(getRoundWinner(round({ aPos: null, bPos: null }))).toBe("tie");
  });
});

describe("summarizeHeadToHead", () => {
  it("returns zeros for no shared rounds", () => {
    expect(summarizeHeadToHead([])).toEqual({
      aWins: 0,
      bWins: 0,
      ties: 0,
      total: 0,
      byEvent: [],
      lastMeeting: null,
    });
  });

  it("aggregates totals and per-event scores sorted by event rank", () => {
    const newest = round({ aPos: 1, bPos: 2, date: "2024-05-01" });
    const summary = summarizeHeadToHead([
      newest,
      round({
        aPos: 3,
        bPos: 1,
        eventId: "222",
        eventName: "2x2x2 Cube",
        eventRank: 20,
      }),
      round({ aPos: 2, bPos: 2 }),
      round({ aPos: 4, bPos: 6 }),
    ]);

    expect(summary.aWins).toBe(2);
    expect(summary.bWins).toBe(1);
    expect(summary.ties).toBe(1);
    expect(summary.total).toBe(4);
    expect(summary.lastMeeting).toBe(newest);
    expect(summary.byEvent).toEqual([
      {
        eventId: "333",
        eventName: "3x3x3 Cube",
        eventRank: 10,
        aWins: 2,
        bWins: 0,
        ties: 1,
      },
      {
        eventId: "222",
        eventName: "2x2x2 Cube",
        eventRank: 20,
        aWins: 0,
        bWins: 1,
        ties: 0,
      },
    ]);
  });
});
