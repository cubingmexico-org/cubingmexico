import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { competitionOrganizer, organizer } from "@workspace/db/schema";
import { insertCompetition, insertPerson } from "@/test/factories";
import {
  getOrganizerLevelCounts,
  getOrganizers,
  getOrganizersGenderCounts,
  getOrganizersStateCounts,
} from "./queries";
import type { GetOrganizersSchema } from "./validations";

function organizersInput(
  overrides: Partial<GetOrganizersSchema> = {},
): GetOrganizersSchema {
  return {
    page: 1,
    perPage: 10,
    sort: [],
    name: "",
    state: [],
    gender: [],
    level: [],
    filters: [],
    joinOperator: "and",
    ...overrides,
  } as GetOrganizersSchema;
}

const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  await insertPerson({
    wcaId: "2010ANA01",
    name: "Ana Organiza",
    stateId: "JAL",
    gender: "f",
  });
  await insertPerson({
    wcaId: "2010BETO01",
    name: "Beto Veterano",
    stateId: "CMX",
  });

  // Levels count competitions from the last two years only.
  await insertCompetition({
    id: "Recent1",
    startDate: new Date(Date.now() - 30 * DAY),
  });
  await insertCompetition({
    id: "Recent2",
    startDate: new Date(Date.now() - 60 * DAY),
  });
  await insertCompetition({
    id: "Old2015",
    startDate: new Date("2015-06-01T00:00:00Z"),
  });

  await db.insert(organizer).values([
    { id: "o-ana", personId: "2010ANA01" },
    { id: "o-beto", personId: "2010BETO01" },
  ]);
  await db.insert(competitionOrganizer).values([
    { competitionId: "Recent1", organizerId: "o-ana" },
    { competitionId: "Recent2", organizerId: "o-ana" },
    { competitionId: "Old2015", organizerId: "o-beto" },
  ]);
});

describe("getOrganizers", () => {
  it("derives the level from recent competitions and keeps the all-time total", async () => {
    const { data } = await getOrganizers(organizersInput());

    expect(
      data.map((row) => [
        row.name,
        row.level,
        row.competitions,
        row.totalCompetitions,
      ]),
    ).toEqual([
      ["Ana Organiza", "Super", 2, 2],
      ["Beto Veterano", "Inactivo", 0, 1],
    ]);
  });

  it("filters by level and state", async () => {
    const byLevel = await getOrganizers(
      organizersInput({ level: ["Inactivo"] }),
    );
    expect(byLevel.data.map((row) => row.wcaId)).toEqual(["2010BETO01"]);

    const byState = await getOrganizers(
      organizersInput({ state: ["Jalisco"] }),
    );
    expect(byState.data.map((row) => row.wcaId)).toEqual(["2010ANA01"]);
  });
});

describe("organizer counts", () => {
  it("counts organizers by state, gender and level", async () => {
    expect(await getOrganizersStateCounts()).toEqual({
      "Ciudad de México": 1,
      Jalisco: 1,
    });
    expect(await getOrganizersGenderCounts()).toEqual({ f: 1, m: 1 });
    expect(await getOrganizerLevelCounts()).toEqual({ Super: 1, Inactivo: 1 });
  });
});
