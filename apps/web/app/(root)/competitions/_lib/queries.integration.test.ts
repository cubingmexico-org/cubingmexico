import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { championship, competitionEvent } from "@workspace/db/schema";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertResult,
} from "@/test/factories";
import {
  getCompetitions,
  getCompetitionsStateCounts,
  getCompetitionsStatusCounts,
  getUpcomingCompetitions,
} from "./queries";
import type { GetCompetitionsSchema } from "./validations";

function competitionsInput(
  overrides: Partial<GetCompetitionsSchema> = {},
): GetCompetitionsSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    state: [],
    events: [],
    status: [],
    from: "",
    to: "",
    filters: [],
    joinOperator: "and",
    ...overrides,
  } as GetCompetitionsSchema;
}

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "222", name: "2x2x2 Cube", rank: 20 });
  await insertPerson({ wcaId: "2020AAAA01" });
  await insertPerson({ wcaId: "2020BBBB01" });

  await insertCompetition({
    id: "PastJalisco2020",
    name: "Past Jalisco 2020",
    stateId: "JAL",
    startDate: new Date("2020-03-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "NextCDMX",
    name: "Próximo CDMX",
    stateId: "CMX",
    startDate: new Date(Date.now() + 30 * DAY),
  });
  await insertCompetition({
    id: "AbroadOpen2020",
    countryId: "USA",
    startDate: new Date("2020-04-01T00:00:00Z"),
  });

  await db.insert(competitionEvent).values([
    { competitionId: "PastJalisco2020", eventId: "222" },
    { competitionId: "PastJalisco2020", eventId: "333" },
    { competitionId: "NextCDMX", eventId: "333" },
  ]);
  await db.insert(championship).values({
    id: "mx-2020",
    competitionId: "PastJalisco2020",
    championshipType: "MX",
  });
  for (const [i, personId] of ["2020AAAA01", "2020BBBB01"].entries()) {
    await insertResult({
      id: `r${i}`,
      competitionId: "PastJalisco2020",
      eventId: "333",
      personId,
      best: 1000,
    });
  }
});

describe("getCompetitions", () => {
  it("lists only Mexican competitions with events, status and competitors", async () => {
    const { data, pageCount } = await getCompetitions(competitionsInput());

    expect(pageCount).toBe(1);
    expect(
      data.map((row) => ({
        id: row.id,
        state: row.state,
        events: row.events,
        status: row.status,
        isChampionship: row.isChampionship,
        competitorCount: row.competitorCount,
      })),
    ).toEqual([
      {
        id: "PastJalisco2020",
        state: "Jalisco",
        events: ["333", "222"],
        status: "past",
        isChampionship: true,
        competitorCount: 2,
      },
      {
        id: "NextCDMX",
        state: "Ciudad de México",
        events: ["333"],
        status: "upcoming",
        isChampionship: false,
        competitorCount: null,
      },
    ]);
  });

  it("filters by status, event and accent-insensitive name", async () => {
    const upcoming = await getCompetitions(
      competitionsInput({ status: ["upcoming"] }),
    );
    expect(upcoming.data.map((row) => row.id)).toEqual(["NextCDMX"]);

    const with222 = await getCompetitions(
      competitionsInput({ events: ["2x2x2 Cube"] }),
    );
    expect(with222.data.map((row) => row.id)).toEqual(["PastJalisco2020"]);

    const byName = await getCompetitions(
      competitionsInput({ name: "proximo" }),
    );
    expect(byName.data.map((row) => row.id)).toEqual(["NextCDMX"]);
  });
});

describe("competition counts", () => {
  it("counts by state and status", async () => {
    expect(await getCompetitionsStateCounts()).toEqual({
      "Ciudad de México": 1,
      Jalisco: 1,
    });
    expect(await getCompetitionsStatusCounts()).toEqual({
      past: 1,
      upcoming: 1,
    });
  });
});

describe("getUpcomingCompetitions", () => {
  it("returns future Mexican competitions only", async () => {
    const upcoming = await getUpcomingCompetitions();
    expect(upcoming.map((row) => row.id)).toEqual(["NextCDMX"]);
  });
});
