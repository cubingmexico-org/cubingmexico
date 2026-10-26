import { beforeEach, describe, expect, it } from "vitest";
import { insertPerson, insertSumOfRanks } from "@/test/factories";
import { getSOR, getSORGenderCounts, getSORStateCounts } from "./queries";
import type { GetSORSinglesSchema } from "./validations";

function sorInput(deprecated: boolean): GetSORSinglesSchema {
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
  } as GetSORSinglesSchema;
}

beforeEach(async () => {
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL", gender: "f" });
  await insertPerson({ wcaId: "2020BBBB01", stateId: "CMX", gender: "m" });

  await insertSumOfRanks({
    personId: "2020AAAA01",
    resultType: "single",
    scope: "official",
    overall: 10,
  });
  await insertSumOfRanks({
    personId: "2020AAAA01",
    resultType: "single",
    scope: "all",
    overall: 20,
  });
  await insertSumOfRanks({
    personId: "2020BBBB01",
    resultType: "single",
    scope: "all",
    overall: 30,
  });
  await insertSumOfRanks({
    personId: "2020BBBB01",
    resultType: "average",
    scope: "official",
    overall: 40,
  });
});

describe("getSOR", () => {
  it("reads only the official rows of the rank type by default", async () => {
    const { data } = await getSOR(sorInput(false), "single");
    expect(data.map((row) => [row.personId, row.overall])).toEqual([
      ["2020AAAA01", 10],
    ]);
  });

  it("reads only the all-scope rows with deprecated events", async () => {
    const { data } = await getSOR(sorInput(true), "single");
    expect(data.map((row) => [row.personId, row.overall]).sort()).toEqual([
      ["2020AAAA01", 20],
      ["2020BBBB01", 30],
    ]);
  });

  it("keeps rank types apart within a scope", async () => {
    const { data } = await getSOR(sorInput(false), "average");
    expect(data.map((row) => [row.personId, row.overall])).toEqual([
      ["2020BBBB01", 40],
    ]);
  });
});

describe("SOR facet counts", () => {
  it("counts states per scope", async () => {
    expect(await getSORStateCounts("single", "official")).toEqual({
      Jalisco: 1,
    });
    expect(await getSORStateCounts("single", "all")).toEqual({
      "Ciudad de México": 1,
      Jalisco: 1,
    });
  });

  it("counts genders per scope", async () => {
    expect(await getSORGenderCounts("single", "official")).toEqual({ f: 1 });
    expect(await getSORGenderCounts("single", "all")).toEqual({ f: 1, m: 1 });
  });
});
