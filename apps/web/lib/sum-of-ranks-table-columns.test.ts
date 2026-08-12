import { describe, expect, it } from "vitest";
import { getSumOfRanksBaseEventIds } from "./sum-of-ranks-events";
import { SPECIALTY_EVENT_IDS } from "./constants";

describe("getSumOfRanksBaseEventIds", () => {
  it("includes all specialty events except 333mbf", () => {
    const ids = getSumOfRanksBaseEventIds();
    expect(ids).not.toContain("333mbf");
    expect(ids).toEqual(SPECIALTY_EVENT_IDS.filter((id) => id !== "333mbf"));
  });

  it("keeps specialty event order", () => {
    expect(getSumOfRanksBaseEventIds()[0]).toBe("333");
    expect(getSumOfRanksBaseEventIds().at(-1)).toBe("555bf");
  });
});
