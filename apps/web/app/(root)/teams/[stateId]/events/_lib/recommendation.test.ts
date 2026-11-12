import { describe, expect, it } from "vitest";
import {
  MIN_MEMBERS_FOR_RECOMMENDATION,
  recommendEvents,
  windowSince,
  type RecommendationInput,
} from "./recommendation";

function input(
  demandShare: number,
  interest: number | null,
  supplyShare: number,
  members = 10,
): RecommendationInput {
  return { members, demandShare, interest, supplyShare };
}

/** Three events offered exactly as much as their interest: a typical ratio of 1. */
const TYPICAL = [
  input(0.5, 0.6, 0.6),
  input(0.5, 0.5, 0.5),
  input(0.5, 0.8, 0.8),
];

describe("recommendEvents", () => {
  it("flags events offered too little for their interest", () => {
    const [, , , underServed] = recommendEvents([
      ...TYPICAL,
      input(0.4, 0.8, 0.4),
    ]);
    expect(underServed).toEqual({
      coverage: 0.5,
      recommendation: "more_rounds",
    });
  });

  it("treats events offered in line with their interest as balanced", () => {
    const results = recommendEvents(TYPICAL);
    expect(results.map((r) => r.recommendation)).toEqual([
      "balanced",
      "balanced",
      "balanced",
    ]);
    expect(results[0]!.coverage).toBeCloseTo(1);
  });

  it("flags popular events whose participation comes from being held often", () => {
    const [, , , , frequent, niche] = recommendEvents([
      ...TYPICAL,
      input(0.4, 0.8, 0.4),
      input(0.6, 0.4, 0.8),
      input(0.1, 0.2, 0.4),
    ]);
    expect(frequent).toEqual({ coverage: 2, recommendation: "frequency" });
    expect(niche).toEqual({ coverage: 2, recommendation: "over_offered" });
  });

  it("never calls an event over-offered when members compete in it more than in others", () => {
    const results = recommendEvents([
      input(0.5, 0.8, 0.4),
      input(0.5, 0.8, 0.4),
      input(0.5, 0.6, 0.3),
      input(0.97, 0.97, 1),
    ]);
    expect(results[3]!.coverage).toBeGreaterThan(2);
    expect(results[3]!.recommendation).toBe("balanced");
  });

  it("treats coverage exactly at the thresholds as balanced", () => {
    const [, , , low, high] = recommendEvents([
      ...TYPICAL,
      input(0.5, 0.5, 0.4),
      input(0.5, 0.4, 0.5),
    ]);
    expect(low!.recommendation).toBe("balanced");
    expect(high!.recommendation).toBe("balanced");
  });

  it("flags events the state never holds", () => {
    const [, , , missing] = recommendEvents([...TYPICAL, input(0.3, 0.5, 0)]);
    expect(missing).toEqual({ coverage: 0, recommendation: "more_rounds" });
  });

  it("flags every event when the state holds none", () => {
    const results = recommendEvents([input(0.5, 0.6, 0), input(0.2, 0.3, 0)]);
    expect(results.map((r) => r.recommendation)).toEqual([
      "more_rounds",
      "more_rounds",
    ]);
  });

  it("skips events with too few members without letting them skew the rest", () => {
    const results = recommendEvents([
      ...TYPICAL,
      input(0.9, 0.1, 0.9, MIN_MEMBERS_FOR_RECOMMENDATION - 1),
    ]);
    expect(results[3]).toEqual({ coverage: null, recommendation: null });
    expect(results.slice(0, 3).map((r) => r.recommendation)).toEqual([
      "balanced",
      "balanced",
      "balanced",
    ]);
  });

  it("skips events members never had the chance to compete in", () => {
    const [, , , unseen] = recommendEvents([...TYPICAL, input(0, null, 0.3)]);
    expect(unseen).toEqual({ coverage: null, recommendation: null });
  });
});

describe("windowSince", () => {
  it("returns null for all-time", () => {
    expect(windowSince("all")).toBeNull();
  });

  it("starts 24 months before the first day of the current month", () => {
    expect(windowSince("2y", new Date("2026-11-10T12:00:00Z"))).toBe(
      "2024-11-01",
    );
    expect(windowSince("2y", new Date("2026-01-31T23:00:00Z"))).toBe(
      "2024-01-01",
    );
  });
});
