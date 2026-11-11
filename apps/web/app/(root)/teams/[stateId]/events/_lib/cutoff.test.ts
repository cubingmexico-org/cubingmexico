import { describe, expect, it } from "vitest";
import {
  cutoffAttempts,
  estimateRoundCutoff,
  median,
  MIN_MEMBERS_FOR_CUTOFF,
  MIN_ROUNDS_FOR_TYPICAL_CUTOFF,
  recommendCutoff,
  roundUpCutoff,
  typicalCutoff,
} from "./cutoff";

const MISS = Number.POSITIVE_INFINITY;

describe("cutoffAttempts", () => {
  it("gives two attempts in Ao5 rounds and one in Mo3 rounds", () => {
    expect(cutoffAttempts("a")).toBe(2);
    expect(cutoffAttempts("m")).toBe(1);
  });
});

describe("roundUpCutoff", () => {
  it("rounds to whole seconds under 30 seconds", () => {
    expect(roundUpCutoff(2743)).toBe(2800);
    expect(roundUpCutoff(2999)).toBe(3000);
  });

  it("always rounds strictly up so the exact value still makes it", () => {
    expect(roundUpCutoff(2800)).toBe(2900);
  });

  it("rounds to 5 seconds under 2 minutes", () => {
    expect(roundUpCutoff(3000)).toBe(3500);
    expect(roundUpCutoff(10234)).toBe(10500);
    expect(roundUpCutoff(11999)).toBe(12000);
  });

  it("rounds to 15 seconds under 5 minutes", () => {
    expect(roundUpCutoff(12000)).toBe(13500);
    expect(roundUpCutoff(18800)).toBe(19500);
  });

  it("rounds to 30 seconds from 5 minutes on", () => {
    expect(roundUpCutoff(38000)).toBe(39000);
  });
});

describe("median", () => {
  it("takes the middle value or the mean of the two middle values", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("is a miss when misses reach the middle", () => {
    expect(median([1000, MISS])).toBe(MISS);
    expect(median([1000, 2000, MISS])).toBe(2000);
    expect(median([])).toBe(MISS);
  });
});

describe("estimateRoundCutoff", () => {
  it("picks the roundest value above the slowest made result", () => {
    expect(estimateRoundCutoff(27700, 30900)).toBe(30000);
    expect(estimateRoundCutoff(17800, 20300)).toBe(18000);
    expect(estimateRoundCutoff(4200, 5600)).toBe(4500);
    expect(estimateRoundCutoff(2830, 2950)).toBe(2900);
  });

  it("allows a value equal to the fastest missed result", () => {
    expect(estimateRoundCutoff(5900, 6000)).toBe(6000);
  });

  it("falls back to the fastest missed result in very narrow ranges", () => {
    expect(estimateRoundCutoff(2855, 2880)).toBe(2880);
  });
});

describe("typicalCutoff", () => {
  const round = (slowestMade: number, fastestMissed: number) => ({
    slowestMade,
    fastestMissed,
  });

  it("takes the median of the rounds' estimated cutoffs", () => {
    expect(
      typicalCutoff([
        round(28500, 31000),
        round(29000, 30500),
        round(29900, 33000),
        round(28000, 29500),
        round(31000, 36000),
      ]),
    ).toBe(30000);
  });

  it("skips rounds where everyone made or missed the cutoff, or the bounds conflict", () => {
    const valid = Array.from({ length: 4 }, () => round(28500, 31000));
    expect(
      typicalCutoff([
        ...valid,
        { slowestMade: null, fastestMissed: 31000 },
        { slowestMade: 28500, fastestMissed: null },
        round(31000, 30000),
      ]),
    ).toBeNull();
    expect(typicalCutoff([...valid, round(28500, 31000)])).toBe(30000);
  });

  it("needs a minimum number of rounds", () => {
    const rounds = Array.from({ length: MIN_ROUNDS_FOR_TYPICAL_CUTOFF }, () =>
      round(28500, 31000),
    );
    expect(typicalCutoff(rounds.slice(1))).toBeNull();
    expect(typicalCutoff(rounds)).toBe(30000);
  });
});

describe("recommendCutoff", () => {
  it("lets about three of four members make it", () => {
    expect(
      recommendCutoff([1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500]),
    ).toEqual({
      cutoff: 4000,
      members: 8,
      passing: 6,
      close: 1,
      capped: false,
    });
  });

  it("tolerates a few members who usually miss", () => {
    expect(recommendCutoff([1000, 1100, 1200, 1300, MISS])).toEqual({
      cutoff: 1400,
      members: 5,
      passing: 4,
      close: 0,
      capped: false,
    });
  });

  it("lowers the cutoff to the typical one and recounts members", () => {
    expect(recommendCutoff([30000, 32000, 34000, 50000, 56000], 33000)).toEqual(
      {
        cutoff: 33000,
        members: 5,
        passing: 2,
        close: 1,
        capped: true,
      },
    );
  });

  it("keeps the team cutoff when it is below the typical one", () => {
    expect(recommendCutoff([1000, 1100, 1200, 1300, 1400], 3000)).toMatchObject(
      { cutoff: 1400, capped: false },
    );
  });

  it("counts members just above the cutoff as close", () => {
    const result = recommendCutoff([
      1000, 1000, 1000, 1000, 1000, 1050, 1150, 1250,
    ]);
    expect(result?.cutoff).toBe(1100);
    expect(result?.passing).toBe(6);
    expect(result?.close).toBe(1);
  });

  it("skips events where too many members usually miss", () => {
    expect(recommendCutoff([1000, 2000, MISS, MISS, MISS])).toBeNull();
  });

  it("skips events with too few members", () => {
    const medians = [1000, 1100, 1200, 1300, 1400];
    expect(
      recommendCutoff(medians.slice(0, MIN_MEMBERS_FOR_CUTOFF - 1)),
    ).toBeNull();
    expect(
      recommendCutoff(medians.slice(0, MIN_MEMBERS_FOR_CUTOFF)),
    ).not.toBeNull();
  });
});
