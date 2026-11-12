import { describe, expect, it } from "vitest";
import {
  discreteMedian,
  finalPodium,
  MIN_FINALS_FOR_PODIUM_LEVEL,
  membersAtLevel,
  podiumLevel,
  rankingValue,
} from "./podium";

describe("rankingValue", () => {
  it("ranks Ao5 and Mo3 rounds by average and the rest by single", () => {
    expect(rankingValue("a", 900, 1100)).toBe(1100);
    expect(rankingValue("m", 5000, 5600)).toBe(5600);
    expect(rankingValue("3", 2500, 0)).toBe(2500);
    expect(rankingValue("1", 2500, 0)).toBe(2500);
  });

  it("ignores DNF, DNS and missing values", () => {
    expect(rankingValue("a", 900, -1)).toBeNull();
    expect(rankingValue("3", -1, 0)).toBeNull();
    expect(rankingValue("a", 0, 0)).toBeNull();
  });
});

describe("discreteMedian", () => {
  it("always returns one of the values", () => {
    expect(discreteMedian([3, 1, 2])).toBe(2);
    expect(discreteMedian([4, 1, 3, 2])).toBe(2);
    expect(discreteMedian([])).toBeNull();
  });

  it("keeps encoded Multi-Blind values intact", () => {
    const values = [870360000, 880360000];
    expect(values).toContain(discreteMedian(values));
  });
});

describe("finalPodium", () => {
  it("takes first and third place", () => {
    expect(
      finalPodium([
        { pos: 1, value: 800 },
        { pos: 2, value: 900 },
        { pos: 3, value: 1000 },
      ]),
    ).toEqual({ first: 800, third: 1000 });
  });

  it("uses the slowest podium result when a tie leaves no third place", () => {
    expect(
      finalPodium([
        { pos: 1, value: 800 },
        { pos: 2, value: 900 },
        { pos: 2, value: 900 },
      ]),
    ).toEqual({ first: 800, third: 900 });
  });

  it("leaves missing places empty", () => {
    expect(
      finalPodium([
        { pos: 2, value: 900 },
        { pos: 3, value: null },
      ]),
    ).toEqual({ first: null, third: null });
  });
});

describe("podiumLevel", () => {
  it("takes the typical first and third place across finals", () => {
    expect(
      podiumLevel([
        { first: 800, third: 1100 },
        { first: 900, third: 1200 },
        { first: 1000, third: 1300 },
      ]),
    ).toEqual({ finals: 3, first: 900, third: 1200 });
  });

  it("skips finals without a valid third place", () => {
    expect(
      podiumLevel([
        { first: 800, third: null },
        { first: 900, third: 1200 },
      ]),
    ).toEqual({ finals: 2, first: 800, third: 1200 });
    expect(
      podiumLevel([
        { first: 800, third: null },
        { first: 900, third: null },
      ]),
    ).toEqual({ finals: 2, first: 800, third: null });
  });

  it("needs a minimum number of finals", () => {
    const finals = Array.from({ length: MIN_FINALS_FOR_PODIUM_LEVEL }, () => ({
      first: 800,
      third: 1000,
    }));
    expect(podiumLevel(finals.slice(1))).toBeNull();
    expect(podiumLevel(finals)).not.toBeNull();
    expect(
      podiumLevel([...finals.slice(1), { first: null, third: null }]),
    ).toBeNull();
  });
});

describe("membersAtLevel", () => {
  it("counts PRs strictly better than the typical third place", () => {
    expect(membersAtLevel([900, 1000, 1200, 0, -1], 1000)).toBe(1);
  });

  it("is zero without a third place", () => {
    expect(membersAtLevel([900], null)).toBe(0);
  });
});
