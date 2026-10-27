import { beforeEach, describe, expect, it } from "vitest";
import {
  insertPerson,
  insertRankAverage,
  insertScopeEvents,
} from "@/test/factories";
import { getKinchRanksState } from "./queries";

beforeEach(async () => {
  await insertScopeEvents();
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
  for (const eventId of ["333", "333ft", "333mbo", "fto"]) {
    await insertRankAverage({
      personId: "2020AAAA01",
      eventId,
      best: 1000,
      stateRank: 1,
    });
  }
});

describe("getKinchRanksState", () => {
  it("rates only official events by default", async () => {
    const [ana] = await getKinchRanksState("JAL");
    expect(ana?.events.map((e) => e.eventId)).toEqual(["333"]);
    expect(ana?.overall).toBe(100);
  });

  it("adds deprecated events except 333mbo, and never fto", async () => {
    const [ana] = await getKinchRanksState("JAL", "all");
    expect(ana?.events.map((e) => e.eventId)).toEqual(["333", "333ft"]);
  });
});
