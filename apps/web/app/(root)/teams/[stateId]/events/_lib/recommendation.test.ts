import { describe, expect, it } from "vitest";
import {
  MIN_MEMBERS_FOR_RECOMMENDATION,
  recommendEvent,
  windowSince,
} from "./recommendation";

describe("recommendEvent", () => {
  it("flags events held in far fewer competitions than their member share", () => {
    const result = recommendEvent({
      members: 10,
      demandShare: 0.1,
      supplyShare: 0.05,
    });
    expect(result.recommendation).toBe("more_rounds");
    expect(result.gap).toBeCloseTo(0.05);
    expect(result.coverage).toBeCloseTo(0.5);
  });

  it("treats events held more often than their member share as balanced", () => {
    expect(
      recommendEvent({ members: 10, demandShare: 0.05, supplyShare: 0.5 })
        .recommendation,
    ).toBe("balanced");
  });

  it("treats close shares as balanced", () => {
    expect(
      recommendEvent({ members: 10, demandShare: 0.1, supplyShare: 0.09 })
        .recommendation,
    ).toBe("balanced");
  });

  it("treats coverage exactly at the threshold as balanced", () => {
    expect(
      recommendEvent({ members: 10, demandShare: 0.1, supplyShare: 0.067 })
        .recommendation,
    ).toBe("balanced");
  });

  it("ignores tiny absolute gaps even when the ratio is large", () => {
    expect(
      recommendEvent({ members: 10, demandShare: 0.02, supplyShare: 0 })
        .recommendation,
    ).toBe("balanced");
  });

  it("flags events the state never holds", () => {
    const result = recommendEvent({
      members: 5,
      demandShare: 0.05,
      supplyShare: 0,
    });
    expect(result.recommendation).toBe("more_rounds");
    expect(result.coverage).toBe(0);
  });

  it("skips events with too few members", () => {
    expect(
      recommendEvent({
        members: MIN_MEMBERS_FOR_RECOMMENDATION - 1,
        demandShare: 0.2,
        supplyShare: 0,
      }).recommendation,
    ).toBeNull();
    expect(
      recommendEvent({
        members: MIN_MEMBERS_FOR_RECOMMENDATION,
        demandShare: 0.2,
        supplyShare: 0,
      }).recommendation,
    ).toBe("more_rounds");
  });

  it("skips events nobody competes in", () => {
    const result = recommendEvent({
      members: 0,
      demandShare: 0,
      supplyShare: 0.1,
    });
    expect(result.recommendation).toBeNull();
    expect(result.coverage).toBeNull();
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
