import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertGroup,
  insertGroupMembership,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
  insertResult,
  insertRoundType,
  insertScopeEvents,
} from "@/test/factories";
import {
  getCollectiveBestRecords,
  getCollectiveHeadToHeadResults,
  getTeamBestRecords,
  getTeamHeadToHeadResults,
} from "./queries";

const EVENTS = ["333", "333ft", "fto"];

beforeEach(async () => {
  await insertScopeEvents();
  await insertRoundType({ id: "f", rank: 90 });
  await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
  await insertPerson({ wcaId: "2020BBBB01", stateId: "CMX" });
  await insertCompetition({ id: "Comp2024" });
  await insertGroup({
    id: "vallarta",
    kind: "community",
    name: "Vallarta",
  });
  await insertGroupMembership({
    groupId: "vallarta",
    personId: "2020AAAA01",
  });

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
    await insertRankSingle({
      personId: "2020BBBB01",
      eventId,
      best: 950,
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

describe("collective group compare", () => {
  it("lists best records for a community from member ranks", async () => {
    const records = await getCollectiveBestRecords({
      kind: "community",
      id: "vallarta",
    });
    expect(Object.keys(records)).toEqual(["333"]);
    expect(records["333"]?.single?.personId).toBe("2020AAAA01");
  });

  it("compares a team against a community in shared rounds", async () => {
    const rounds = await getCollectiveHeadToHeadResults(
      { kind: "team", id: "CMX" },
      { kind: "community", id: "vallarta" },
    );
    expect(rounds).toHaveLength(1);
    expect(rounds[0]?.eventId).toBe("333");
    expect(rounds[0]?.a.personId).toBe("2020BBBB01");
    expect(rounds[0]?.b.personId).toBe("2020AAAA01");
  });
});
