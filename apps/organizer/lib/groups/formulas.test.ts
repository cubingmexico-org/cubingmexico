import { describe, expect, it } from "vitest";
import {
  preferredGroupSize,
  stationsInUse,
  suggestedGroupCount,
  suggestedJudges,
  suggestedRunners,
  suggestedScramblers,
  suggestStaffForRound,
} from "./formulas";

describe("preferredGroupSize", () => {
  it("scales stations by 1.7", () => {
    expect(preferredGroupSize(10)).toBe(17);
  });
});

describe("suggestedGroupCount", () => {
  it("uses min of 2 groups for round 1", () => {
    expect(
      suggestedGroupCount({ competitors: 1, stations: 0, roundNumber: 1 }),
    ).toBe(2);
  });

  it("uses min of 1 group for later rounds", () => {
    expect(
      suggestedGroupCount({ competitors: 1, stations: 0, roundNumber: 2 }),
    ).toBe(1);
  });

  it("suggests more groups as competitor count grows", () => {
    const small = suggestedGroupCount({
      competitors: 20,
      stations: 10,
      roundNumber: 1,
    });
    const large = suggestedGroupCount({
      competitors: 100,
      stations: 10,
      roundNumber: 1,
    });
    expect(large).toBeGreaterThan(small);
  });
});

describe("stationsInUse", () => {
  it("caps at stations when competitors exceed stations", () => {
    expect(stationsInUse(8, 20)).toBe(8);
  });

  it("caps at competitors when fewer than stations", () => {
    expect(stationsInUse(8, 3)).toBe(3);
  });
});

describe("staff suggestions", () => {
  it("returns zero scramblers/runners for empty stations", () => {
    expect(suggestedScramblers(0)).toBe(0);
    expect(suggestedRunners(0)).toBe(0);
  });

  it("skips judges when assignJudges is false", () => {
    expect(suggestedJudges(10, 8, false)).toBe(0);
  });

  it("builds a coherent staff suggestion for a round", () => {
    const suggestion = suggestStaffForRound({
      stations: 10,
      competitors: 40,
      roundNumber: 1,
    });
    expect(suggestion.groups).toBeGreaterThanOrEqual(2);
    expect(suggestion.peoplePerGroup).toBeGreaterThan(0);
    expect(suggestion.stationsInUse).toBeGreaterThan(0);
    expect(suggestion.scramblers).toBeGreaterThan(0);
    expect(suggestion.runners).toBeGreaterThan(0);
    expect(suggestion.judges).toBeGreaterThan(0);
  });
});
