import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
  insertResult,
} from "@/test/factories";
import {
  getRankAverages,
  getRankSingles,
  getRankSinglesGenderCounts,
  getRankSinglesStateCounts,
} from "./queries";
import type { GetRankSinglesSchema } from "./validations";

function rankInput(
  overrides: Partial<GetRankSinglesSchema> = {},
): GetRankSinglesSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    state: [],
    gender: [],
    asOf: "",
    filters: [],
    joinOperator: "and",
    ...overrides,
  } as GetRankSinglesSchema;
}

beforeEach(async () => {
  await insertEvent({ id: "333" });
  await insertPerson({
    wcaId: "2020AAAA01",
    name: "Ana Pérez",
    stateId: "JAL",
    gender: "f",
  });
  await insertPerson({
    wcaId: "2020BBBB01",
    name: "Beto Ruiz",
    stateId: "JAL",
    gender: "m",
  });
  await insertPerson({
    wcaId: "2020CCCC01",
    name: "Carlos Díaz",
    stateId: "CMX",
    gender: "m",
  });
  await insertPerson({
    wcaId: "2020DDDD01",
    name: "Dora Gil",
    stateId: "CMX",
    gender: "f",
  });
});

describe("getRankSingles", () => {
  beforeEach(async () => {
    await insertRankSingle({
      personId: "2020CCCC01",
      eventId: "333",
      best: 500,
      countryRank: 1,
      stateRank: 1,
    });
    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 600,
      countryRank: 2,
      stateRank: 1,
    });
    await insertRankSingle({
      personId: "2020BBBB01",
      eventId: "333",
      best: 700,
      countryRank: 3,
      stateRank: 2,
    });
    await insertRankSingle({
      personId: "2020DDDD01",
      eventId: "333",
      best: 800,
      countryRank: 0,
    });
  });

  it("returns ranked people in country-rank order, skipping countryRank 0", async () => {
    const { data, pageCount } = await getRankSingles(rankInput(), "333");

    expect(data.map((r) => r.personId)).toEqual([
      "2020CCCC01",
      "2020AAAA01",
      "2020BBBB01",
    ]);
    expect(data[1]).toMatchObject({
      best: 600,
      stateRank: 1,
      state: "Jalisco",
      name: "Ana Pérez",
    });
    expect(pageCount).toBe(1);
  });

  it("filters by state name and gender", async () => {
    const byState = await getRankSingles(
      rankInput({ state: ["Jalisco"] }),
      "333",
    );
    expect(byState.data.map((r) => r.personId)).toEqual([
      "2020AAAA01",
      "2020BBBB01",
    ]);

    const byGender = await getRankSingles(rankInput({ gender: ["m"] }), "333");
    expect(byGender.data.map((r) => r.personId)).toEqual([
      "2020CCCC01",
      "2020BBBB01",
    ]);
  });

  it("matches names without accents", async () => {
    const { data } = await getRankSingles(rankInput({ name: "perez" }), "333");
    expect(data.map((r) => r.personId)).toEqual(["2020AAAA01"]);
  });

  it("paginates and reports the page count", async () => {
    const page2 = await getRankSingles(
      rankInput({ page: 2, perPage: 2 }),
      "333",
    );
    expect(page2.data.map((r) => r.personId)).toEqual(["2020BBBB01"]);
    expect(page2.pageCount).toBe(2);
  });

  it("counts people per state and gender", async () => {
    expect(await getRankSinglesStateCounts("333")).toEqual({
      "Ciudad de México": 2,
      Jalisco: 2,
    });
    expect(await getRankSinglesGenderCounts("333")).toEqual({ f: 2, m: 2 });
  });
});

describe("getRankSingles with asOf", () => {
  it("ranks personal bests from results up to the given date", async () => {
    await insertCompetition({
      id: "Early2023",
      startDate: new Date("2023-05-01T00:00:00Z"),
    });
    await insertCompetition({
      id: "Late2024",
      startDate: new Date("2024-05-01T00:00:00Z"),
    });

    await insertResult({
      id: "e1",
      competitionId: "Early2023",
      eventId: "333",
      personId: "2020AAAA01",
      best: 900,
    });
    await insertResult({
      id: "e2",
      competitionId: "Early2023",
      eventId: "333",
      personId: "2020CCCC01",
      best: 1000,
    });
    await insertResult({
      id: "e3",
      competitionId: "Early2023",
      eventId: "333",
      personId: "2020BBBB01",
      best: -1,
    });
    await insertResult({
      id: "l1",
      competitionId: "Late2024",
      eventId: "333",
      personId: "2020CCCC01",
      best: 400,
    });

    const { data } = await getRankSingles(
      rankInput({ asOf: "2023-12-31" }),
      "333",
    );

    expect(
      data.map((r) => ({
        personId: r.personId,
        best: r.best,
        countryRank: Number(r.countryRank),
        stateRank: Number(r.stateRank),
      })),
    ).toEqual([
      { personId: "2020AAAA01", best: 900, countryRank: 1, stateRank: 1 },
      { personId: "2020CCCC01", best: 1000, countryRank: 2, stateRank: 1 },
    ]);
  });
});

describe("getRankAverages", () => {
  it("returns average rankings independently of singles", async () => {
    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 600,
      countryRank: 1,
    });
    await insertRankAverage({
      personId: "2020BBBB01",
      eventId: "333",
      best: 750,
      countryRank: 1,
      stateRank: 1,
    });
    await insertRankAverage({
      personId: "2020AAAA01",
      eventId: "333",
      best: 800,
      countryRank: 2,
      stateRank: 2,
    });

    const { data } = await getRankAverages(rankInput(), "333");

    expect(data.map((r) => [r.personId, r.best, r.stateRank])).toEqual([
      ["2020BBBB01", 750, 1],
      ["2020AAAA01", 800, 2],
    ]);
  });
});
