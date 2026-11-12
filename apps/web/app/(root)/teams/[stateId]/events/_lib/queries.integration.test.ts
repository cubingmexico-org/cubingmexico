import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
  insertResult,
  insertResultAttempts,
  insertRoundType,
} from "@/test/factories";
import { getTeamEventCutoffs, getTeamEventInsights } from "./queries";

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
      multiRoundMembers: 4,
      advancedMembers: 3,
      finalistMembers: 3,
      podiums: 4,
      roundsHosted: 2,
      competitionsHosted: 1,
      supplyShare: 1,
      interest: 5 / 8,
      exposure: 1,
      top100Single: 1,
      top100Average: 1,
      bestNationalRank: 3,
      coverage: 1,
      recommendation: "balanced",
    });
  });

  it("counts members who advance and reach finals only in events with more than one round", async () => {
    await insertEvent({ id: "pyram", name: "Pyraminx", rank: 40 });
    await insertRoundType({ id: "2", rank: 20 });
    await insertRound("Jal2025", "pyram", "1", [
      "2020AAAA01",
      "2020BBBB01",
      "2020CCCC01",
      "2020DDDD01",
    ]);
    await insertRound("Jal2025", "pyram", "2", [
      "2020AAAA01",
      "2020BBBB01",
      "2020CCCC01",
    ]);
    await insertRound("Jal2025", "pyram", "f", ["2020AAAA01"]);

    const events = byId(await getTeamEventInsights("JAL", SINCE, "official"));

    expect(events.pyram).toMatchObject({
      multiRoundMembers: 4,
      advancedMembers: 3,
      finalistMembers: 1,
    });
    expect(events["222"]).toMatchObject({
      multiRoundMembers: 0,
      advancedMembers: 0,
      finalistMembers: 0,
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
      interest: 1,
      exposure: 0.5,
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

describe("getTeamEventCutoffs", () => {
  let attemptCounter = 0;
  async function insertWithAttempts(
    competitionId: string,
    eventId: string,
    personId: string,
    formatId: string,
    attempts: number[],
  ) {
    attemptCounter += 1;
    const id = `c${attemptCounter}`;
    await insertResult({
      id,
      competitionId,
      eventId,
      personId,
      formatId,
      roundTypeId: "1",
    });
    await insertResultAttempts(id, attempts);
  }

  beforeEach(async () => {
    attemptCounter = 0;
    await insertEvent({ id: "666", name: "6x6x6 Cube", rank: 70 });
    await insertPerson({ wcaId: "2020FFFF01", stateId: "JAL" });

    const ao5: [string, number[]][] = [
      ["2020AAAA01", [800, 900, 700, 700, 700]],
      ["2020BBBB01", [1000, 1100, 1000, 1000, 1000]],
      ["2020CCCC01", [-1, 1200, 1000, 1000, 1000]],
      ["2020DDDD01", [-1, -1, 500, 500, 500]],
      ["2020FFFF01", [1500, 1400, 1400, 1400, 1400]],
      ["2020EEEE01", [100, 100, 100, 100, 100]],
    ];
    for (const [personId, attempts] of ao5) {
      await insertWithAttempts("Jal2025", "333", personId, "a", attempts);
      await insertWithAttempts("Jal2025", "fto", personId, "a", attempts);
    }
    await insertWithAttempts("Jal2015", "333", "2020FFFF01", "a", [100, 100]);

    const mo3: [string, number[]][] = [
      ["2020AAAA01", [6000, 1000, 1000]],
      ["2020BBBB01", [6100, 6100, 6100]],
      ["2020CCCC01", [6200, 6200, 6200]],
      ["2020DDDD01", [7000, 100, 100]],
      ["2020FFFF01", [6400, 6400, 6400]],
    ];
    for (const [personId, attempts] of mo3) {
      await insertWithAttempts("Cmx2025", "666", personId, "m", attempts);
    }
  });

  function byEvent(cutoffs: Awaited<ReturnType<typeof getTeamEventCutoffs>>) {
    return Object.fromEntries(cutoffs.map((c) => [c.eventId, c]));
  }

  it("uses the best of the first two attempts in Ao5 rounds", async () => {
    const cutoffs = byEvent(await getTeamEventCutoffs("JAL", SINCE, SINCE));

    expect(cutoffs["333"]).toEqual({
      eventId: "333",
      eventName: "3x3x3 Cube",
      eventRank: 10,
      attempts: 2,
      cutoff: 1500,
      members: 5,
      passing: 4,
      close: 0,
      capped: false,
    });
  });

  it("uses only the first attempt in Mo3 rounds", async () => {
    const cutoffs = byEvent(await getTeamEventCutoffs("JAL", SINCE, SINCE));

    expect(cutoffs["666"]).toMatchObject({
      attempts: 1,
      cutoff: 6500,
      members: 5,
      passing: 4,
      close: 1,
      capped: false,
    });
  });

  it("caps at the typical cutoff of rounds with a cutoff in Mexico", async () => {
    await insertRoundType({ id: "c", rank: 80 });
    await insertPerson({ wcaId: "2020GGGG01" });
    for (let i = 1; i <= 5; i++) {
      const competitionId = `Cutoff2025${i}`;
      await insertCompetition({
        id: competitionId,
        stateId: "CMX",
        startDate: new Date("2025-09-01T00:00:00Z"),
      });
      for (const [personId, attempts] of [
        ["2020EEEE01", [6250, 6200, 6300]],
        ["2020GGGG01", [6400, 0, 0]],
      ] as const) {
        attemptCounter += 1;
        const id = `c${attemptCounter}`;
        await insertResult({
          id,
          competitionId,
          eventId: "666",
          personId,
          formatId: "m",
          roundTypeId: "c",
        });
        await insertResultAttempts(id, [...attempts]);
      }
    }

    const cutoffs = byEvent(await getTeamEventCutoffs("JAL", SINCE, SINCE));
    expect(cutoffs["666"]).toMatchObject({
      cutoff: 6300,
      passing: 3,
      close: 1,
      capped: true,
    });

    const older = byEvent(
      await getTeamEventCutoffs("JAL", SINCE, "2026-01-01"),
    );
    expect(older["666"]).toMatchObject({ cutoff: 6500, capped: false });
  });

  it("includes older competitions in the all-time window", async () => {
    const cutoffs = byEvent(await getTeamEventCutoffs("JAL", null, SINCE));

    expect(cutoffs["333"]).toMatchObject({ cutoff: 1300, passing: 4 });
  });

  it("never suggests cutoffs for unofficial events or with few members", async () => {
    const cutoffs = await getTeamEventCutoffs("JAL", SINCE, SINCE);
    expect(cutoffs.map((c) => c.eventId)).toEqual(["333", "666"]);

    expect(await getTeamEventCutoffs("CMX", SINCE, SINCE)).toEqual([]);
  });
});
