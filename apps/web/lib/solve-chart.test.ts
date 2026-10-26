import { describe, expect, it } from "vitest";
import {
  attemptToChartValue,
  calculateAoN,
  calculateDeviation,
  formatTotalTime,
} from "@/lib/solve-chart";

describe("calculateAoN", () => {
  it("returns null until there are N solves", () => {
    expect(calculateAoN([1, 2, 3, 4], 5)).toBeNull();
  });

  it("trims the best and worst solve for Ao12", () => {
    const solves = [100, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0];
    // Drops 0 and 100, averages 1..10.
    expect(calculateAoN(solves, 12)).toBe(5.5);
  });

  it("only uses the last N solves", () => {
    const solves = [999, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(calculateAoN(solves, 12)).toBe(6.5);
  });

  it("counts one DNF as the worst solve in Ao12", () => {
    const solves = [null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    // Drops the DNF and 1, averages 2..11.
    expect(calculateAoN(solves, 12)).toBe(6.5);
  });

  it("returns null when DNFs exceed the trimmed count", () => {
    const solves = [null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculateAoN(solves, 12)).toBeNull();
  });

  it("trims 3 per side for Ao50 and 5 per side for Ao100", () => {
    const ao50 = Array.from({ length: 50 }, (_, i) => i + 1);
    // Keeps 4..47.
    expect(calculateAoN(ao50, 50)).toBe(25.5);

    const ao100: (number | null)[] = Array.from(
      { length: 100 },
      (_, i) => i + 1,
    );
    ao100[0] = null;
    ao100[1] = null;
    // 2 DNFs fill 2 of the 5 worst slots; keeps 8..97.
    expect(calculateAoN(ao100, 100)).toBe(52.5);
  });

  it("allows as many DNFs as trimmed solves in Ao50", () => {
    const solves: (number | null)[] = Array.from(
      { length: 50 },
      (_, i) => i + 1,
    );
    solves[0] = null;
    solves[1] = null;
    solves[2] = null;
    expect(calculateAoN(solves, 50)).not.toBeNull();
    solves[3] = null;
    expect(calculateAoN(solves, 50)).toBeNull();
  });
});

describe("calculateDeviation", () => {
  it("needs at least two values", () => {
    expect(calculateDeviation([5])).toBeNull();
  });

  it("returns the sample standard deviation", () => {
    expect(calculateDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
});

describe("attemptToChartValue", () => {
  it("maps DNF and DNS to null", () => {
    expect(attemptToChartValue("333", -1)).toBeNull();
    expect(attemptToChartValue("333", -2)).toBeNull();
    expect(attemptToChartValue("333", 0)).toBeNull();
  });

  it("converts centiseconds to seconds", () => {
    expect(attemptToChartValue("333", 1234)).toBe(12.34);
  });

  it("keeps FMC move counts", () => {
    expect(attemptToChartValue("333fm", 28)).toBe(28);
  });

  it("uses MBLD points", () => {
    // 0DDTTTTTMM: DD=97 (2 points), 3600 s, 1 missed -> 3/4
    expect(attemptToChartValue("333mbf", 970360001)).toBe(2);
  });
});

describe("formatTotalTime", () => {
  it("formats seconds, minutes, hours and days", () => {
    expect(formatTotalTime("333", 12.3)).toBe("12.30s");
    expect(formatTotalTime("333", 75.5)).toBe("1m 15.50s");
    expect(formatTotalTime("333", 3_725)).toBe("1h 2m 05.00s");
    expect(formatTotalTime("333", 90_061)).toBe("1d 1h 1m 01.00s");
  });

  it("formats FMC moves and MBLD points", () => {
    expect(formatTotalTime("333fm", 1234)).toBe("1,234 movs");
    expect(formatTotalTime("333mbf", 57)).toBe("57 pts");
  });

  it("shows a dash for missing values", () => {
    expect(formatTotalTime("333", null)).toBe("—");
  });
});
