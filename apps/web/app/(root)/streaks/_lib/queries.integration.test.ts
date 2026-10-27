import { beforeEach, describe, expect, it } from "vitest";
import { insertPerson, insertStreakRank } from "@/test/factories";
import {
  getStreakRanks,
  getStreakRanksGenderCounts,
  getStreakRanksStateCounts,
} from "./queries";
import type { GetStreakRanksSchema } from "./validations";

function streakInput(deprecated: boolean): GetStreakRanksSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    state: [],
    gender: [],
    filters: [],
    joinOperator: "and",
    deprecated,
  } as GetStreakRanksSchema;
}

beforeEach(async () => {
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL", gender: "f" });
  await insertPerson({ wcaId: "2020BBBB01", stateId: "CMX", gender: "m" });

  await insertStreakRank({
    personId: "2020AAAA01",
    scope: "official",
    longestStreak: 3,
  });
  await insertStreakRank({
    personId: "2020AAAA01",
    scope: "all",
    longestStreak: 5,
  });
  await insertStreakRank({
    personId: "2020BBBB01",
    scope: "all",
    rank: 2,
    longestStreak: 4,
  });
});

describe("getStreakRanks", () => {
  it("reads only the official rows by default", async () => {
    const { data } = await getStreakRanks(streakInput(false));
    expect(data.map((row) => [row.personId, row.longestStreak])).toEqual([
      ["2020AAAA01", 3],
    ]);
  });

  it("reads only the all-scope rows with deprecated events", async () => {
    const { data } = await getStreakRanks(streakInput(true));
    expect(data.map((row) => [row.personId, row.longestStreak])).toEqual([
      ["2020AAAA01", 5],
      ["2020BBBB01", 4],
    ]);
  });
});

describe("streak facet counts", () => {
  it("counts states per scope", async () => {
    expect(await getStreakRanksStateCounts("official")).toEqual({
      Jalisco: 1,
    });
    expect(await getStreakRanksStateCounts("all")).toEqual({
      "Ciudad de México": 1,
      Jalisco: 1,
    });
  });

  it("counts genders per scope", async () => {
    expect(await getStreakRanksGenderCounts("official")).toEqual({ f: 1 });
    expect(await getStreakRanksGenderCounts("all")).toEqual({ f: 1, m: 1 });
  });
});
