import { beforeEach, describe, expect, it } from "vitest";
import { insertNemesisStat, insertPerson } from "@/test/factories";
import {
  getNemesisStateBreakdown,
  getNemesisStatsGenderCounts,
  getNemesisStatsStateCounts,
  getNemesisStatsTable,
  getNemesisSummary,
} from "./queries";
import type { GetNemesisStatsSchema } from "./validations";

function statsInput(
  overrides: Partial<GetNemesisStatsSchema> = {},
): GetNemesisStatsSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    state: [],
    gender: [],
    view: "mas-nemesis",
    minEvents: 1,
    deprecated: false,
    ...overrides,
  } as GetNemesisStatsSchema;
}

beforeEach(async () => {
  await insertPerson({
    wcaId: "2020AAAA01",
    name: "Ana",
    stateId: "JAL",
    gender: "f",
  });
  await insertPerson({
    wcaId: "2020BBBB01",
    name: "Beto",
    stateId: "CMX",
    gender: "m",
  });

  await insertNemesisStat({
    personId: "2020AAAA01",
    scope: "official",
    nemesisCount: 0,
    nemesizedCount: 1,
  });
  await insertNemesisStat({
    personId: "2020AAAA01",
    scope: "all",
    nemesisCount: 2,
    nemesizedCount: 0,
  });
  await insertNemesisStat({
    personId: "2020BBBB01",
    scope: "all",
    nemesisCount: 0,
    nemesizedCount: 3,
  });
});

describe("getNemesisStatsTable", () => {
  it("reads only the official rows by default", async () => {
    const { data } = await getNemesisStatsTable(statsInput());
    expect(data.map((row) => [row.personId, row.nemesisCount])).toEqual([
      ["2020AAAA01", 0],
    ]);
  });

  it("reads only the all-scope rows with deprecated events", async () => {
    const { data } = await getNemesisStatsTable(
      statsInput({ deprecated: true }),
    );
    expect(data.map((row) => [row.personId, row.nemesisCount])).toEqual([
      ["2020AAAA01", 2],
      ["2020BBBB01", 0],
    ]);
  });
});

describe("nemesis aggregates", () => {
  it("summarizes each scope separately", async () => {
    const official = await getNemesisSummary("official");
    expect(official.competitors).toBe(1);
    expect(official.invictos).toBe(1);
    expect(official.topNemesized?.personId).toBe("2020AAAA01");

    const all = await getNemesisSummary("all");
    expect(all.competitors).toBe(2);
    expect(all.invictos).toBe(1);
    expect(all.topNemesized?.personId).toBe("2020BBBB01");
  });

  it("breaks states down per scope", async () => {
    const official = await getNemesisStateBreakdown("official");
    expect(official.map((row) => [row.stateId, row.competitors])).toEqual([
      ["JAL", 1],
    ]);

    const all = await getNemesisStateBreakdown("all");
    expect(all.map((row) => [row.stateId, row.invictos]).sort()).toEqual([
      ["CMX", 1],
      ["JAL", 0],
    ]);
  });

  it("counts states and genders per scope", async () => {
    expect(await getNemesisStatsStateCounts("official")).toEqual({
      Jalisco: 1,
    });
    expect(await getNemesisStatsGenderCounts("all")).toEqual({ f: 1, m: 1 });
  });
});
