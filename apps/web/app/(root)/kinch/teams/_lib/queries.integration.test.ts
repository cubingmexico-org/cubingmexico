import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { team } from "@workspace/db/schema";
import {
  insertPerson,
  insertRankAverage,
  insertScopeEvents,
} from "@/test/factories";
import { getKinchRanksTeams } from "./queries";

beforeEach(async () => {
  await insertScopeEvents();
  await db.insert(team).values({ stateId: "JAL", name: "Jalisco" });
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
  for (const eventId of ["333", "333ft", "333mbo", "fto"]) {
    await insertRankAverage({
      personId: "2020AAAA01",
      eventId,
      best: 1000,
      countryRank: 1,
    });
  }
});

describe("getKinchRanksTeams", () => {
  it("rates only official events by default", async () => {
    const [jalisco] = await getKinchRanksTeams();
    expect(jalisco?.events.map((e) => e.eventId)).toEqual(["333"]);
    expect(jalisco?.overall).toBe(100);
  });

  it("adds deprecated events except 333mbo, and never fto", async () => {
    const [jalisco] = await getKinchRanksTeams("all");
    expect(jalisco?.events.map((e) => e.eventId)).toEqual(["333", "333ft"]);
  });
});
