import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { team } from "@workspace/db/schema";
import {
  insertPerson,
  insertRankAverage,
  insertRankSingle,
  insertScopeEvents,
} from "@/test/factories";
import { getSORTeamsAverage, getSORTeamsSingle } from "./queries";

const EVENTS = ["333", "333ft", "333mbo", "fto"];

beforeEach(async () => {
  await insertScopeEvents();
  await db.insert(team).values({ stateId: "JAL", name: "Jalisco" });
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
  for (const eventId of EVENTS) {
    await insertRankSingle({ personId: "2020AAAA01", eventId, best: 900 });
    await insertRankAverage({ personId: "2020AAAA01", eventId, best: 1000 });
  }
});

describe.each([
  ["average", getSORTeamsAverage],
  ["single", getSORTeamsSingle],
] as const)("getSORTeams (%s)", (_, getTeams) => {
  it("sums only official events by default", async () => {
    const [jalisco] = await getTeams();
    expect(jalisco?.events.map((e) => e.eventId)).toEqual(["333"]);
    expect(Number(jalisco?.overall)).toBe(1);
  });

  it("adds every deprecated event, and never fto", async () => {
    const [jalisco] = await getTeams("all");
    expect(jalisco?.events.map((e) => e.eventId)).toEqual([
      "333",
      "333ft",
      "333mbo",
    ]);
  });
});
