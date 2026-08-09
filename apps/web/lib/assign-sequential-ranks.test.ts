import { describe, expect, it } from "vitest";
import { assignSequentialRanks } from "@/lib/assign-sequential-ranks";

describe("assignSequentialRanks", () => {
  it("assigns 1-based ranks in order", () => {
    expect(
      assignSequentialRanks([
        { personId: "a", eventId: "333" },
        { personId: "b", eventId: "333" },
        { personId: "c", eventId: "333" },
      ]),
    ).toEqual([
      { personId: "a", eventId: "333", stateRank: 1 },
      { personId: "b", eventId: "333", stateRank: 2 },
      { personId: "c", eventId: "333", stateRank: 3 },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(assignSequentialRanks([])).toEqual([]);
  });
});
