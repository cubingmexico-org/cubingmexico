import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { result } from "@workspace/db/schema";
import {
  clearPersonStateRecords,
  updateStateRecords,
} from "@/lib/update-state-records";
import {
  insertCompetition,
  insertCompetitionRoundDate,
  insertEvent,
  insertPerson,
  insertResult,
  insertRoundType,
} from "@/test/factories";

const JAL_PERSON = "2020AAAA01";
const JAL_PERSON_2 = "2020BBBB01";
const CMX_PERSON = "2020CCCC01";

async function srMarkers() {
  const rows = await db
    .select({
      id: result.id,
      single: result.stateSingleRecord,
      average: result.stateAverageRecord,
    })
    .from(result);
  return Object.fromEntries(
    rows.map((r) => [r.id, { single: r.single, average: r.average }]),
  );
}

async function taggedSingles() {
  const markers = await srMarkers();
  return Object.entries(markers)
    .filter(([, m]) => m.single === "SR")
    .map(([id]) => id)
    .sort();
}

async function competitionOn(id: string, day: string) {
  await insertCompetition({ id, startDate: new Date(`${day}T00:00:00Z`) });
}

beforeEach(async () => {
  await insertEvent({ id: "333" });
  await insertRoundType({ id: "1", rank: 10 });
  await insertRoundType({ id: "f", rank: 90 });
  await insertPerson({ wcaId: JAL_PERSON, stateId: "JAL" });
  await insertPerson({ wcaId: JAL_PERSON_2, stateId: "JAL" });
  await insertPerson({ wcaId: CMX_PERSON, stateId: "CMX" });
});

describe("updateStateRecords", () => {
  it("tags each chronological improvement across the state's members", async () => {
    await competitionOn("CompA2024", "2024-01-01");
    await competitionOn("CompB2024", "2024-02-01");
    await competitionOn("CompC2024", "2024-03-01");

    await insertResult({ id: "a", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, best: 1000 });
    await insertResult({ id: "b", competitionId: "CompB2024", eventId: "333", personId: JAL_PERSON_2, best: 1200 });
    await insertResult({ id: "c", competitionId: "CompC2024", eventId: "333", personId: JAL_PERSON_2, best: 900 });
    await insertResult({ id: "x", competitionId: "CompC2024", eventId: "333", personId: CMX_PERSON, best: 500 });

    const summary = await updateStateRecords("JAL");

    expect(await taggedSingles()).toEqual(["a", "c"]);
    expect(summary.singleCount).toBe(2);
    expect(summary.personIds.sort()).toEqual([JAL_PERSON, JAL_PERSON_2]);
  });

  it("tags only the best improvement when several happen on the same day", async () => {
    await competitionOn("CompA2024", "2024-01-01");

    await insertResult({ id: "r1", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, roundTypeId: "1", best: 1000 });
    await insertResult({ id: "rf", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, roundTypeId: "f", best: 950 });

    await updateStateRecords("JAL");

    expect(await taggedSingles()).toEqual(["rf"]);
  });

  it("uses the round end date from competition_round_dates when present", async () => {
    await competitionOn("CompA2024", "2024-01-01");
    await insertCompetitionRoundDate({ competitionId: "CompA2024", eventId: "333", roundTypeId: "1", endDate: "2024-01-01" });
    await insertCompetitionRoundDate({ competitionId: "CompA2024", eventId: "333", roundTypeId: "f", endDate: "2024-01-02" });

    await insertResult({ id: "r1", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, roundTypeId: "1", best: 1000 });
    await insertResult({ id: "rf", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, roundTypeId: "f", best: 950 });

    await updateStateRecords("JAL");

    expect(await taggedSingles()).toEqual(["r1", "rf"]);
  });

  it("does not tag NR/NAR/WR results but lets them advance the running best", async () => {
    await competitionOn("CompA2024", "2024-01-01");
    await competitionOn("CompB2024", "2024-02-01");
    await competitionOn("CompC2024", "2024-03-01");

    await insertResult({ id: "nr", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, best: 1000, regionalSingleRecord: "NR" });
    await insertResult({ id: "slower", competitionId: "CompB2024", eventId: "333", personId: JAL_PERSON_2, best: 1050 });
    await insertResult({ id: "faster", competitionId: "CompC2024", eventId: "333", personId: JAL_PERSON_2, best: 990 });

    await updateStateRecords("JAL");

    expect(await taggedSingles()).toEqual(["faster"]);
  });

  it("ignores DNF/DNS results", async () => {
    await competitionOn("CompA2024", "2024-01-01");
    await competitionOn("CompB2024", "2024-02-01");

    await insertResult({ id: "dnf", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, best: -1 });
    await insertResult({ id: "ok", competitionId: "CompB2024", eventId: "333", personId: JAL_PERSON, best: 1000 });

    await updateStateRecords("JAL");

    expect(await taggedSingles()).toEqual(["ok"]);
  });

  it("clears stale markers on members but leaves other states alone", async () => {
    await competitionOn("CompA2024", "2024-01-01");
    await competitionOn("CompB2024", "2024-02-01");

    await insertResult({ id: "first", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, best: 900 });
    await insertResult({ id: "stale", competitionId: "CompB2024", eventId: "333", personId: JAL_PERSON, best: 1000, stateSingleRecord: "SR" });
    await insertResult({ id: "other", competitionId: "CompB2024", eventId: "333", personId: CMX_PERSON, best: 2000, stateSingleRecord: "SR" });

    await updateStateRecords("JAL");

    expect(await taggedSingles()).toEqual(["first", "other"]);
  });

  it("computes average records independently of singles", async () => {
    await competitionOn("CompA2024", "2024-01-01");
    await competitionOn("CompB2024", "2024-02-01");

    await insertResult({ id: "a", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, best: 900, average: 1100 });
    await insertResult({ id: "b", competitionId: "CompB2024", eventId: "333", personId: JAL_PERSON, best: 950, average: 1000 });

    const summary = await updateStateRecords("JAL");

    expect(await srMarkers()).toEqual({
      a: { single: "SR", average: "SR" },
      b: { single: null, average: "SR" },
    });
    expect(summary).toMatchObject({ singleCount: 1, averageCount: 2 });
  });

  it("returns empty counts for a state without members", async () => {
    await expect(updateStateRecords("ZAC")).resolves.toEqual({
      personIds: [],
      singleCount: 0,
      averageCount: 0,
    });
  });

  it("throws for an unknown state", async () => {
    await expect(updateStateRecords("XXX")).rejects.toThrow("Invalid stateId");
  });
});

describe("clearPersonStateRecords", () => {
  it("clears markers only for the given people", async () => {
    await competitionOn("CompA2024", "2024-01-01");

    await insertResult({ id: "mine", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON, best: 900, stateSingleRecord: "SR", stateAverageRecord: "SR" });
    await insertResult({ id: "theirs", competitionId: "CompA2024", eventId: "333", personId: JAL_PERSON_2, best: 950, stateSingleRecord: "SR" });

    await clearPersonStateRecords([JAL_PERSON]);

    expect(await srMarkers()).toEqual({
      mine: { single: null, average: null },
      theirs: { single: "SR", average: null },
    });
  });
});
