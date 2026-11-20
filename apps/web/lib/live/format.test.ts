import { describe, expect, it } from "vitest";
import {
  formatLiveResultValue,
  formatRecordTag,
  liveRoundCompletedCount,
  liveRoundEventId,
  liveRoundLabel,
  liveRoundStateLabel,
  parseLiveRoundId,
} from "./format";

describe("live format helpers", () => {
  it("parses WCIF-style round ids", () => {
    expect(parseLiveRoundId("333-r3")).toEqual({
      eventId: "333",
      roundNumber: 3,
    });
    expect(parseLiveRoundId("333oh-r1")).toEqual({
      eventId: "333oh",
      roundNumber: 1,
    });
    expect(parseLiveRoundId("bad")).toBeNull();
  });

  it("labels rounds and states in Spanish", () => {
    expect(liveRoundEventId("333-r2")).toBe("333");
    expect(liveRoundLabel("333-r2")).toContain("Ronda 2");
    expect(liveRoundStateLabel("open")).toBe("En curso");
    expect(liveRoundStateLabel("locked")).toBe("Cerrada");
  });

  it("formats result values including DNF/DNS and empty", () => {
    expect(formatLiveResultValue("333", 595)).toBe("5.95");
    expect(formatLiveResultValue("333", -1)).toBe("DNF");
    expect(formatLiveResultValue("333", -2)).toBe("DNS");
    expect(formatLiveResultValue("333", 0)).toBe("—");
    expect(formatLiveResultValue("333", null)).toBe("—");
  });

  it("passes through record tags", () => {
    expect(formatRecordTag("PR")).toBe("PR");
    expect(formatRecordTag(null)).toBeNull();
  });

  it("falls back completed count for locked rounds missing the field", () => {
    expect(
      liveRoundCompletedCount({
        state: "locked",
        total_competitors: 78,
      }),
    ).toBe(78);
    expect(
      liveRoundCompletedCount({
        state: "locked",
        completed_competitors: null,
        total_competitors: 34,
      }),
    ).toBe(34);
    expect(
      liveRoundCompletedCount({
        state: "locked",
        completed_competitors: 50,
        total_competitors: 78,
      }),
    ).toBe(50);
    expect(
      liveRoundCompletedCount({
        state: "open",
        total_competitors: 65,
      }),
    ).toBe(0);
    expect(
      liveRoundCompletedCount({
        state: "open",
        completed_competitors: 44,
        total_competitors: 65,
      }),
    ).toBe(44);
  });
});
