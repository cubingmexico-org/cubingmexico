import { beforeEach, describe, expect, it } from "vitest";
import {
  insertEvent,
  insertPerson,
  insertRankSingle,
} from "@/test/factories";
import { getSOSR, getSOSRGenderCounts, getSOSRState } from "./queries";
import type { GetSOSRSinglesSchema } from "./validations";

function sosrInput(
  overrides: Partial<GetSOSRSinglesSchema> = {},
): GetSOSRSinglesSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    gender: [],
    filters: [],
    joinOperator: "and",
    ...overrides,
  } as GetSOSRSinglesSchema;
}

beforeEach(async () => {
  await insertEvent({ id: "333", rank: 10 });
  await insertEvent({ id: "222", rank: 20 });
  await insertEvent({ id: "333ft", rank: 30 });

  await insertPerson({ wcaId: "2020AAAA01", name: "Ana", stateId: "JAL", gender: "f" });
  await insertPerson({ wcaId: "2020BBBB01", name: "Beto", stateId: "JAL", gender: "m" });
  await insertPerson({ wcaId: "2020CCCC01", name: "Carlos", stateId: "JAL", gender: "m" });
  await insertPerson({ wcaId: "2020DDDD01", name: "Dora", stateId: "CMX", gender: "f" });

  // 333: Ana 1, Beto 2. 222: Ana 1 only. Carlos has no state ranks at all.
  await insertRankSingle({ personId: "2020AAAA01", eventId: "333", best: 600, stateRank: 1 });
  await insertRankSingle({ personId: "2020BBBB01", eventId: "333", best: 700, stateRank: 2 });
  await insertRankSingle({ personId: "2020AAAA01", eventId: "222", best: 200, stateRank: 1 });
  await insertRankSingle({ personId: "2020BBBB01", eventId: "333ft", best: 2000, stateRank: 1 });
  await insertRankSingle({ personId: "2020DDDD01", eventId: "333", best: 500, stateRank: 1 });
});

describe("getSOSR", () => {
  it("sums state ranks and charges worst rank + 1 for missing events", async () => {
    const { data, pageCount } = await getSOSR(sosrInput(), "JAL", "single");

    expect(pageCount).toBe(1);
    expect(
      data.map((row) => ({
        personId: row.personId,
        rank: Number(row.rank),
        overall: Number(row.overall),
      })),
    ).toEqual([
      { personId: "2020AAAA01", rank: 1, overall: 2 },
      // 333 rank 2 + 222 missing (worst rank 1 + 1 = 2); 333ft is excluded.
      { personId: "2020BBBB01", rank: 2, overall: 4 },
    ]);

    const beto = data.find((row) => row.personId === "2020BBBB01")!;
    expect(beto.events).toEqual([
      { eventId: "333", stateRank: 2, completed: true },
      { eventId: "222", stateRank: 2, completed: false },
    ]);
  });

  it("filters by gender", async () => {
    const { data } = await getSOSR(sosrInput({ gender: ["m"] }), "JAL", "single");
    expect(data.map((row) => row.personId)).toEqual(["2020BBBB01"]);
  });

  it("returns nothing for the average table when no averages exist", async () => {
    const { data, pageCount } = await getSOSR(sosrInput(), "JAL", "average");
    expect(data).toEqual([]);
    expect(pageCount).toBe(0);
  });
});

describe("getSOSRGenderCounts / getSOSRState", () => {
  it("counts distinct ranked people by gender in the state", async () => {
    expect(await getSOSRGenderCounts("JAL", "single")).toEqual({ f: 1, m: 1 });
  });

  it("looks up the state name", async () => {
    expect(await getSOSRState("JAL")).toEqual({ name: "Jalisco" });
    expect(await getSOSRState("XXX")).toBeNull();
  });
});
