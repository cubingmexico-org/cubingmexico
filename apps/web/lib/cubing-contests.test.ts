import { describe, expect, it } from "vitest";
import {
  ccIconClass,
  formatCcResult,
  summarizeCcYear,
  type CcYearSummaryRow,
} from "@/lib/cubing-contests";

describe("summarizeCcYear", () => {
  const row = (overrides: Partial<CcYearSummaryRow>): CcYearSummaryRow => ({
    eventId: "fto",
    eventName: "FTO",
    competitionId: "A",
    roundTypeId: "f",
    position: 1,
    best: 3000,
    ...overrides,
  });

  it("counts results, competitions, events and final podiums", () => {
    expect(
      summarizeCcYear([
        row({}),
        row({ roundTypeId: "1", position: 1 }),
        row({ competitionId: "B", position: 2 }),
        row({ eventId: "kilominx", eventName: "Kilominx", position: 3 }),
        row({ eventId: "kilominx", eventName: "Kilominx", best: -1 }),
        row({ eventId: "kilominx", eventName: "Kilominx", position: 4 }),
      ]),
    ).toEqual({
      resultCount: 6,
      competitionCount: 2,
      events: [
        { eventId: "fto", eventName: "FTO" },
        { eventId: "kilominx", eventName: "Kilominx" },
      ],
      podiums: { gold: 1, silver: 1, bronze: 1 },
    });
  });
});

describe("ccIconClass", () => {
  it("uses unofficial icons when available", () => {
    expect(ccIconClass("fto")).toBe("cubing-icon unofficial-fto");
  });

  it("uses WCA icons for former WCA events", () => {
    expect(ccIconClass("magic")).toBe("cubing-icon event-magic");
  });

  it("returns null when there is no icon", () => {
    expect(ccIconClass("444oh")).toBeNull();
  });
});

describe("formatCcResult", () => {
  it("formats times", () => {
    expect(formatCcResult("time", 4271)).toBe("42.71");
    expect(formatCcResult("time", 6512)).toBe("1:05.12");
  });

  it("handles empty, DNF and DNS", () => {
    expect(formatCcResult("time", 0)).toBeNull();
    expect(formatCcResult("time", -1)).toBe("DNF");
    expect(formatCcResult("time", -2)).toBe("DNS");
  });

  it("formats move counts with means stored x100", () => {
    expect(formatCcResult("number", 31)).toBe("31");
    expect(formatCcResult("number", 3167, "average")).toBe("31.67");
  });

  it("decodes Cubing Contests multi results", () => {
    // 5/7 in 52:13.00: DDDD 9996 (difference 3), TTTTTTT 0313300, MMMM 0002
    expect(formatCcResult("multi", 999603133000002)).toBe("5/7 52:13.00");
    expect(formatCcResult("multi", -999603133000002)).toBe(
      "DNF (5/7 52:13.00)",
    );
  });
});
