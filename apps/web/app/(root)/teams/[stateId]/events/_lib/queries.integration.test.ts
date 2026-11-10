import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
  insertResult,
  insertRoundType,
} from "@/test/factories";
import { getTeamEventInsights } from "./queries";

const SINCE = "2024-01-01";

let resultCounter = 0;
async function insertRound(
  competitionId: string,
  eventId: string,
  roundTypeId: string,
  personIds: string[],
) {
  for (const [index, personId] of personIds.entries()) {
    resultCounter += 1;
    await insertResult({
      id: `r${resultCounter}`,
      competitionId,
      eventId,
      personId,
      roundTypeId,
      pos: index + 1,
      best: 1000 + index,
    });
  }
}

beforeEach(async () => {
  resultCounter = 0;
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "222", name: "2x2x2 Cube", rank: 20 });
  await insertEvent({ id: "sq1", name: "Square-1", rank: 30 });
  await insertEvent({ id: "333ft", name: "3x3x3 With Feet", rank: 996 });
  await insertEvent({ id: "fto", name: "Face-Turning Octahedron", rank: 810 });
  await insertRoundType({ id: "1", rank: 10 });
  await insertRoundType({ id: "f", rank: 90 });

  for (const wcaId of [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
    "2020DDDD01",
  ]) {
    await insertPerson({ wcaId, stateId: "JAL" });
  }
  await insertPerson({ wcaId: "2020EEEE01", stateId: "CMX" });

  await insertCompetition({
    id: "Jal2025",
    stateId: "JAL",
    startDate: new Date("2025-06-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "Cmx2025",
    stateId: "CMX",
    startDate: new Date("2025-08-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "Usa2025",
    countryId: "USA",
    startDate: new Date("2025-07-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "Jal2015",
    stateId: "JAL",
    startDate: new Date("2015-01-01T00:00:00Z"),
  });

  await insertRound("Jal2025", "333", "1", [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
    "2020DDDD01",
    "2020EEEE01",
  ]);
  await insertRound("Jal2025", "333", "f", [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
  ]);
  await insertRound("Jal2025", "222", "f", ["2020AAAA01", "2020BBBB01"]);
  await insertRound("Jal2025", "fto", "f", [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
  ]);
  await insertRound("Cmx2025", "sq1", "f", [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
    "2020DDDD01",
  ]);
  await insertRound("Cmx2025", "333", "f", ["2020AAAA01", "2020EEEE01"]);
  await insertRound("Usa2025", "222", "f", ["2020CCCC01"]);
  await insertRound("Jal2015", "333ft", "f", [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
  ]);
  await insertRound("Jal2015", "333", "f", ["2020AAAA01"]);

  await insertRankSingle({
    personId: "2020AAAA01",
    eventId: "333",
    best: 900,
    countryRank: 5,
  });
  await insertRankSingle({
    personId: "2020BBBB01",
    eventId: "333",
    best: 1200,
    countryRank: 150,
  });
  await insertRankSingle({
    personId: "2020EEEE01",
    eventId: "333",
    best: 700,
    countryRank: 1,
  });
  await insertRankAverage({
    personId: "2020AAAA01",
    eventId: "333",
    best: 950,
    countryRank: 3,
  });
  await insertRankSingle({
    personId: "2020AAAA01",
    eventId: "333ft",
    best: 3000,
    countryRank: 2,
  });
});

function byId(insights: Awaited<ReturnType<typeof getTeamEventInsights>>) {
  return Object.fromEntries(insights.events.map((e) => [e.eventId, e]));
}

describe("getTeamEventInsights", () => {
  it("counts official participation and hosted rounds within the window", async () => {
    const insights = await getTeamEventInsights("JAL", SINCE, "official");
    const events = byId(insights);

    expect(insights.activeMembers).toBe(4);
    expect(insights.hostedRounds).toBe(3);
    expect(insights.hostedCompetitions).toBe(1);
    expect(insights.events.map((e) => e.eventId)).toEqual([
      "333",
      "222",
      "sq1",
    ]);

    expect(events["333"]).toMatchObject({
      members: 4,
      demandShare: 1,
      roundsCompeted: 3,
      roundsCompetedOutside: 1,
      podiums: 4,
      roundsHosted: 2,
      competitionsHosted: 1,
      supplyShare: 1,
      top100Single: 1,
      top100Average: 1,
      bestNationalRank: 3,
      recommendation: "balanced",
    });
  });

  it("compares member share against the share of hosted competitions", async () => {
    const events = byId(await getTeamEventInsights("JAL", null, "official"));

    expect(events["333"]).toMatchObject({
      demandShare: 1,
      competitionsHosted: 2,
      supplyShare: 1,
    });
    expect(events["222"]!.demandShare).toBeCloseTo(0.5);
    expect(events["222"]!.supplyShare).toBeCloseTo(0.5);
  });

  it("flags popular events the state does not hold", async () => {
    const events = byId(await getTeamEventInsights("JAL", SINCE, "official"));

    expect(events.sq1).toMatchObject({
      members: 4,
      roundsHosted: 0,
      roundsCompetedOutside: 1,
      coverage: 0,
      recommendation: "more_rounds",
    });
  });

  it("ignores competitions outside Mexico and skips events with few members", async () => {
    const events = byId(await getTeamEventInsights("JAL", SINCE, "official"));

    expect(events["222"]).toMatchObject({
      members: 2,
      roundsCompeted: 1,
      roundsHosted: 1,
      recommendation: null,
    });
  });

  it("never includes announced events and only adds deprecated ones to the all scope", async () => {
    const official = byId(await getTeamEventInsights("JAL", null, "official"));
    expect(official.fto).toBeUndefined();
    expect(official["333ft"]).toBeUndefined();

    const all = byId(await getTeamEventInsights("JAL", null, "all"));
    expect(all.fto).toBeUndefined();
    expect(all["333ft"]).toMatchObject({
      isOfficial: false,
      members: 3,
      roundsHosted: 1,
      bestNationalRank: 2,
      demandShare: null,
      supplyShare: null,
      recommendation: null,
    });
  });

  it("includes older competitions in the all-time window", async () => {
    const insights = await getTeamEventInsights("JAL", null, "official");
    const events = byId(insights);

    expect(insights.hostedCompetitions).toBe(2);
    expect(insights.hostedRounds).toBe(4);
    expect(events["333"]).toMatchObject({
      roundsHosted: 3,
      competitionsHosted: 2,
      roundsCompeted: 4,
    });
  });
});
