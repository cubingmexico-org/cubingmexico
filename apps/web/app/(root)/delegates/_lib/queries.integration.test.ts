import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { competitionDelegate, delegate } from "@workspace/db/schema";
import { insertCompetition, insertPerson } from "@/test/factories";
import {
  getDelegateLevelCounts,
  getDelegates,
  getDelegatesGenderCounts,
  getDelegatesStateCounts,
  getDelegateStatusCounts,
} from "./queries";
import type { GetDelegatesSchema } from "./validations";

function delegatesInput(
  overrides: Partial<GetDelegatesSchema> = {},
): GetDelegatesSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    state: [],
    gender: [],
    status: [],
    level: [],
    filters: [],
    joinOperator: "and",
    ...overrides,
  } as GetDelegatesSchema;
}

beforeEach(async () => {
  await insertPerson({
    wcaId: "2010ANA01",
    name: "Ana Delegada",
    stateId: "JAL",
    gender: "f",
  });
  await insertPerson({
    wcaId: "2010BETO01",
    name: "Beto Delegado",
    stateId: "CMX",
  });
  await insertPerson({
    wcaId: "2010CARL01",
    name: "Carlos Sin Compes",
    stateId: "CMX",
  });
  await insertCompetition({ id: "CompA2024" });
  await insertCompetition({ id: "CompB2024" });

  await db.insert(delegate).values([
    {
      id: "d-ana",
      personId: "2010ANA01",
      status: "active",
      level: "full_delegate",
    },
    {
      id: "d-beto",
      personId: "2010BETO01",
      status: "inactive",
      level: "junior_delegate",
    },
    {
      id: "d-carl",
      personId: "2010CARL01",
      status: "active",
      level: "trainee_delegate",
    },
  ]);
  await db.insert(competitionDelegate).values([
    { competitionId: "CompA2024", delegateId: "d-ana" },
    { competitionId: "CompB2024", delegateId: "d-ana" },
    { competitionId: "CompA2024", delegateId: "d-beto" },
  ]);
});

describe("getDelegates", () => {
  it("lists delegates who delegated a competition, with their counts", async () => {
    const { data, pageCount } = await getDelegates(delegatesInput());

    expect(pageCount).toBe(1);
    expect(data.map((row) => [row.name, row.state, row.competitions])).toEqual([
      ["Ana Delegada", "Jalisco", 2],
      ["Beto Delegado", "Ciudad de México", 1],
    ]);
  });

  it("filters by accent-insensitive name, state and status", async () => {
    const byName = await getDelegates(delegatesInput({ name: "delegadá" }));
    expect(byName.data.map((row) => row.wcaId)).toEqual(["2010ANA01"]);

    const byState = await getDelegates(
      delegatesInput({ state: ["Ciudad de México"] }),
    );
    expect(byState.data.map((row) => row.wcaId)).toEqual(["2010BETO01"]);

    const byStatus = await getDelegates(delegatesInput({ status: ["active"] }));
    expect(byStatus.data.map((row) => row.wcaId)).toEqual(["2010ANA01"]);
  });

  it("paginates", async () => {
    const { data, pageCount } = await getDelegates(
      delegatesInput({ perPage: 1, page: 2 }),
    );
    expect(pageCount).toBe(2);
    expect(data.map((row) => row.wcaId)).toEqual(["2010BETO01"]);
  });
});

describe("delegate counts", () => {
  it("counts every delegate by state, gender, status and level", async () => {
    expect(await getDelegatesStateCounts()).toEqual({
      "Ciudad de México": 2,
      Jalisco: 1,
    });
    expect(await getDelegatesGenderCounts()).toEqual({ f: 1, m: 2 });
    expect(await getDelegateStatusCounts()).toEqual({ active: 2, inactive: 1 });
    expect(await getDelegateLevelCounts()).toEqual({
      full_delegate: 1,
      junior_delegate: 1,
      trainee_delegate: 1,
    });
  });
});
