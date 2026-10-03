import { describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { rankAverage, rankSingle } from "@workspace/db/schema";
import {
  clearPersonStateRanks,
  updateStateRanks,
} from "@/lib/update-state-ranks";
import {
  insertEvent,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
} from "@/test/factories";

async function stateRanks(table: typeof rankSingle | typeof rankAverage) {
  const rows = await db
    .select({
      personId: table.personId,
      eventId: table.eventId,
      stateRank: table.stateRank,
    })
    .from(table);
  return Object.fromEntries(
    rows.map((r) => [`${r.personId}:${r.eventId}`, r.stateRank]),
  );
}

describe("updateStateRanks", () => {
  it("assigns state ranks in country-rank order and ignores other states", async () => {
    await insertEvent({ id: "333" });
    await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
    await insertPerson({ wcaId: "2020BBBB01", stateId: "JAL" });
    await insertPerson({ wcaId: "2020CCCC01", stateId: "CMX" });
    await insertPerson({ wcaId: "2020DDDD01", stateId: "JAL" });

    await insertRankSingle({
      personId: "2020CCCC01",
      eventId: "333",
      best: 500,
      countryRank: 1,
    });
    await insertRankSingle({
      personId: "2020BBBB01",
      eventId: "333",
      best: 600,
      countryRank: 2,
    });
    await insertRankSingle({
      personId: "2020DDDD01",
      eventId: "333",
      best: 700,
      countryRank: 3,
    });
    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 800,
      countryRank: 4,
    });

    await updateStateRanks("JAL");

    expect(await stateRanks(rankSingle)).toEqual({
      "2020BBBB01:333": 1,
      "2020DDDD01:333": 2,
      "2020AAAA01:333": 3,
      "2020CCCC01:333": null,
    });
  });

  it("skips rows with countryRank 0 and excluded events", async () => {
    await insertEvent({ id: "333" });
    await insertEvent({ id: "333ft" });
    await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
    await insertPerson({ wcaId: "2020BBBB01", stateId: "JAL" });

    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 500,
      countryRank: 0,
    });
    await insertRankSingle({
      personId: "2020BBBB01",
      eventId: "333",
      best: 600,
      countryRank: 5,
    });
    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333ft",
      best: 900,
      countryRank: 1,
    });

    await updateStateRanks("JAL");

    expect(await stateRanks(rankSingle)).toEqual({
      "2020AAAA01:333": null,
      "2020BBBB01:333": 1,
      "2020AAAA01:333ft": null,
    });
  });

  it("clears stale state ranks before writing new ones", async () => {
    await insertEvent({ id: "333" });
    await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });

    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 500,
      countryRank: 0,
      stateRank: 7,
    });

    await updateStateRanks("JAL");

    expect(await stateRanks(rankSingle)).toEqual({ "2020AAAA01:333": null });
  });

  it("computes single and average ranks independently", async () => {
    await insertEvent({ id: "333" });
    await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
    await insertPerson({ wcaId: "2020BBBB01", stateId: "JAL" });

    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 500,
      countryRank: 1,
    });
    await insertRankSingle({
      personId: "2020BBBB01",
      eventId: "333",
      best: 600,
      countryRank: 2,
    });
    await insertRankAverage({
      personId: "2020BBBB01",
      eventId: "333",
      best: 650,
      countryRank: 1,
    });
    await insertRankAverage({
      personId: "2020AAAA01",
      eventId: "333",
      best: 700,
      countryRank: 2,
    });

    await updateStateRanks("JAL");

    expect(await stateRanks(rankSingle)).toEqual({
      "2020AAAA01:333": 1,
      "2020BBBB01:333": 2,
    });
    expect(await stateRanks(rankAverage)).toEqual({
      "2020BBBB01:333": 1,
      "2020AAAA01:333": 2,
    });
  });

  it("throws for an unknown state", async () => {
    await expect(updateStateRanks("XXX")).rejects.toThrow("Invalid stateId");
  });
});

describe("clearPersonStateRanks", () => {
  it("clears ranks only for the given people", async () => {
    await insertEvent({ id: "333" });
    await insertPerson({ wcaId: "2020AAAA01", stateId: "JAL" });
    await insertPerson({ wcaId: "2020BBBB01", stateId: "JAL" });

    await insertRankSingle({
      personId: "2020AAAA01",
      eventId: "333",
      best: 500,
      stateRank: 1,
    });
    await insertRankSingle({
      personId: "2020BBBB01",
      eventId: "333",
      best: 600,
      stateRank: 2,
    });
    await insertRankAverage({
      personId: "2020AAAA01",
      eventId: "333",
      best: 550,
      stateRank: 1,
    });

    await clearPersonStateRanks(["2020AAAA01"]);

    expect(await stateRanks(rankSingle)).toEqual({
      "2020AAAA01:333": null,
      "2020BBBB01:333": 2,
    });
    expect(await stateRanks(rankAverage)).toEqual({ "2020AAAA01:333": null });
  });

  it("is a no-op for an empty list", async () => {
    await expect(clearPersonStateRanks([])).resolves.toBeUndefined();
  });
});
