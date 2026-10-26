import { beforeEach, describe, expect, it } from "vitest";
import { insertKinchRank, insertPerson } from "@/test/factories";
import {
  getKinchRanks,
  getKinchRanksGenderCounts,
  getKinchRanksStateCounts,
} from "./queries";
import type { GetKinchSinglesSchema } from "./validations";

function kinchInput(deprecated: boolean): GetKinchSinglesSchema {
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
  } as GetKinchSinglesSchema;
}

beforeEach(async () => {
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL", gender: "f" });
  await insertPerson({ wcaId: "2020BBBB01", stateId: "CMX", gender: "m" });

  await insertKinchRank({
    personId: "2020AAAA01",
    scope: "official",
    overall: 90,
  });
  await insertKinchRank({ personId: "2020AAAA01", scope: "all", overall: 80 });
  await insertKinchRank({ personId: "2020BBBB01", scope: "all", overall: 70 });
});

describe("getKinchRanks", () => {
  it("reads only the official rows by default", async () => {
    const { data, pageCount } = await getKinchRanks(kinchInput(false));
    expect(data.map((row) => [row.personId, row.overall])).toEqual([
      ["2020AAAA01", 90],
    ]);
    expect(pageCount).toBe(1);
  });

  it("reads only the all-scope rows with deprecated events", async () => {
    const { data } = await getKinchRanks(kinchInput(true));
    expect(data.map((row) => [row.personId, row.overall]).sort()).toEqual([
      ["2020AAAA01", 80],
      ["2020BBBB01", 70],
    ]);
  });
});

describe("Kinch facet counts", () => {
  it("counts states per scope", async () => {
    expect(await getKinchRanksStateCounts("official")).toEqual({
      Jalisco: 1,
    });
    expect(await getKinchRanksStateCounts("all")).toEqual({
      "Ciudad de México": 1,
      Jalisco: 1,
    });
  });

  it("counts genders per scope", async () => {
    expect(await getKinchRanksGenderCounts("official")).toEqual({ f: 1 });
    expect(await getKinchRanksGenderCounts("all")).toEqual({ f: 1, m: 1 });
  });
});
