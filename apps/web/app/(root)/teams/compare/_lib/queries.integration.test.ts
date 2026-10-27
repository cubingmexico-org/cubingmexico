import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
  insertResult,
  insertRoundType,
  insertScopeEvents,
} from "@/test/factories";
import { getTeamBestRecords, getTeamHeadToHeadResults } from "./queries";

const EVENTS = ["333", "333ft", "fto"];

beforeEach(async () => {
  await insertScopeEvents();
  await insertRoundType({ id: "f", rank: 90 });
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
  await insertPerson({ wcaId: "2020BBBB01", stateId: "CMX" });
  await insertCompetition({ id: "Comp2024" });

  for (const eventId of EVENTS) {
    await insertRankSingle({
      personId: "2020AAAA01",
      eventId,
      best: 900,
      stateRank: 1,
    });
    await insertRankAverage({
      personId: "2020AAAA01",
      eventId,
      best: 1000,
      stateRank: 1,
    });
    for (const [index, personId] of ["2020AAAA01", "2020BBBB01"].entries()) {
      await insertResult({
        id: `${eventId}-${personId}`,
        competitionId: "Comp2024",
        eventId,
        personId,
        roundTypeId: "f",
        pos: index + 1,
        best: 1000 + index,
      });
    }
  }
});

describe("getTeamBestRecords", () => {
  it("lists only official events by default", async () => {
    expect(Object.keys(await getTeamBestRecords("JAL"))).toEqual(["333"]);
  });

  it("adds deprecated events, and never fto", async () => {
    expect(Object.keys(await getTeamBestRecords("JAL", "all")).sort()).toEqual([
      "333",
      "333ft",
    ]);
  });
});

describe("getTeamHeadToHeadResults", () => {
  it("compares only official events by default", async () => {
    const rounds = await getTeamHeadToHeadResults("JAL", "CMX");
    expect(rounds.map((round) => round.eventId)).toEqual(["333"]);
  });

  it("adds deprecated events, and never fto", async () => {
    const rounds = await getTeamHeadToHeadResults("JAL", "CMX", "all");
    expect(rounds.map((round) => round.eventId)).toEqual(["333", "333ft"]);
  });
});
