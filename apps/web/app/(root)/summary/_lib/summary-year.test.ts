import { describe, expect, it } from "vitest";
import {
  canCompleteGoalYear,
  canShowGoalsLinks,
  getEditableGoalYear,
  isGoalYearClosed,
  isSummaryYearPublished,
} from "./summary-year";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("isSummaryYearPublished", () => {
  it("publishes past years and the current year from Dec 20", () => {
    expect(isSummaryYearPublished(2025, at("2026-03-01"))).toBe(true);
    expect(isSummaryYearPublished(2026, at("2026-12-19"))).toBe(false);
    expect(isSummaryYearPublished(2026, at("2026-12-20"))).toBe(true);
    expect(isSummaryYearPublished(2027, at("2026-12-31"))).toBe(false);
  });
});

describe("getEditableGoalYear", () => {
  it("opens next year's goals when the summary unlocks", () => {
    expect(getEditableGoalYear(at("2026-12-19"))).toBeNull();
    expect(getEditableGoalYear(at("2026-12-20"))).toBe(2027);
    expect(getEditableGoalYear(at("2026-12-31"))).toBe(2027);
  });

  it("keeps the current year's goals editable through January", () => {
    expect(getEditableGoalYear(at("2027-01-01"))).toBe(2027);
    expect(getEditableGoalYear(at("2027-01-31"))).toBe(2027);
    expect(getEditableGoalYear(at("2027-02-01"))).toBeNull();
    expect(getEditableGoalYear(at("2027-07-15"))).toBeNull();
  });

  it("opens next year's goals early for a preview", () => {
    expect(getEditableGoalYear(at("2026-11-10"), true)).toBe(2027);
    expect(getEditableGoalYear(at("2027-01-15"), true)).toBe(2027);
  });
});

describe("isGoalYearClosed", () => {
  it("closes a goal year once the next one starts", () => {
    expect(isGoalYearClosed(2027, at("2027-12-31"))).toBe(false);
    expect(isGoalYearClosed(2027, at("2028-01-01"))).toBe(true);
  });
});

describe("canShowGoalsLinks", () => {
  it("opens with the 2026 summaries and stays open afterwards", () => {
    expect(canShowGoalsLinks(false, at("2026-12-19"))).toBe(false);
    expect(canShowGoalsLinks(true, at("2026-12-19"))).toBe(true);
    expect(canShowGoalsLinks(false, at("2026-12-20"))).toBe(true);
    expect(canShowGoalsLinks(false, at("2027-06-01"))).toBe(true);
  });
});

describe("canCompleteGoalYear", () => {
  it("allows the current year and the previous one through January", () => {
    expect(canCompleteGoalYear(2027, at("2027-06-01"))).toBe(true);
    expect(canCompleteGoalYear(2027, at("2028-01-31"))).toBe(true);
    expect(canCompleteGoalYear(2027, at("2028-02-01"))).toBe(false);
    expect(canCompleteGoalYear(2028, at("2027-12-25"))).toBe(false);
  });
});
