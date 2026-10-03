import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { resultAttempts } from "@workspace/db/schema";
import {
  insertCompetition,
  insertCompetitionRoundDate,
  insertEvent,
  insertPerson,
  insertResult,
  insertRoundType,
} from "@/test/factories";
import { getRecordHistory, getRecords } from "./queries";
import type { GetRecordsSchema } from "./validations";

function recordsInput(
  overrides: Partial<GetRecordsSchema> = {},
): GetRecordsSchema {
  return {
    state: "",
    gender: null,
    event: "",
    show: "mixed",
    asOf: "",
    ...overrides,
  } as GetRecordsSchema;
}

beforeEach(async () => {
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "222", name: "2x2x2 Cube", rank: 20 });
  await insertEvent({ id: "333ft", name: "3x3x3 With Feet", rank: 30 });
  await insertRoundType({ id: "f", rank: 90 });

  await insertPerson({ wcaId: "2020AAAA01", name: "Ana", stateId: "JAL", gender: "f" });
  await insertPerson({ wcaId: "2020BBBB01", name: "Beto", stateId: "CMX", gender: "m" });

  await insertCompetition({ id: "Comp2023", name: "Comp 2023", startDate: new Date("2023-06-01T00:00:00Z") });
  await insertCompetition({ id: "Comp2024", name: "Comp 2024", startDate: new Date("2024-06-01T00:00:00Z") });
});

describe("getRecords", () => {
  beforeEach(async () => {
    await insertResult({ id: "a333", competitionId: "Comp2023", eventId: "333", personId: "2020AAAA01", best: 800, average: 950 });
    await insertResult({ id: "b333", competitionId: "Comp2024", eventId: "333", personId: "2020BBBB01", best: 700, average: 1000 });
    await insertResult({ id: "a222", competitionId: "Comp2024", eventId: "222", personId: "2020AAAA01", best: 150, average: 0 });
    await insertResult({ id: "aft", competitionId: "Comp2024", eventId: "333ft", personId: "2020AAAA01", best: 100, average: 200 });

    await db.insert(resultAttempts).values([
      { resultId: "b333", attemptNumber: 1, value: 700 },
      { resultId: "b333", attemptNumber: 2, value: 1100 },
    ]);
  });

  it("returns the best single and average per event, ordered by event rank", async () => {
    const records = await getRecords(recordsInput());

    expect(records.map((r) => r.eventId)).toEqual(["333", "222"]);

    const cube = records[0]!;
    expect(cube.single).toMatchObject({ best: 700, personId: "2020BBBB01", state: "Ciudad de México", solves: [700, 1100] });
    expect(cube.average).toMatchObject({ best: 950, personId: "2020AAAA01", state: "Jalisco" });

    expect(records[1]!.average).toBeNull();
  });

  it("restricts to a state", async () => {
    const records = await getRecords(recordsInput({ state: "Jalisco" }));
    expect(records.find((r) => r.eventId === "333")!.single).toMatchObject({ best: 800, personId: "2020AAAA01" });
  });

  it("ignores results from competitions after asOf", async () => {
    const records = await getRecords(recordsInput({ asOf: "2023-12-31" }));
    expect(records.map((r) => [r.eventId, r.single.best])).toEqual([["333", 800]]);
  });
});

describe("getRecordHistory", () => {
  it("lists NR results nationally, newest first", async () => {
    await insertResult({ id: "nr1", competitionId: "Comp2023", eventId: "333", personId: "2020AAAA01", best: 800, regionalSingleRecord: "NR" });
    await insertResult({ id: "nr2", competitionId: "Comp2024", eventId: "333", personId: "2020BBBB01", best: 700, average: 900, regionalSingleRecord: "NR", regionalAverageRecord: "NR" });
    await insertResult({ id: "sr", competitionId: "Comp2024", eventId: "222", personId: "2020AAAA01", best: 300, stateSingleRecord: "SR" });

    const history = await getRecordHistory(recordsInput());

    expect(history.map((h) => [h.resultId, h.recordDate, h.isSingleRecord, h.isAverageRecord])).toEqual([
      ["nr2", "2024-06-01", true, true],
      ["nr1", "2023-06-01", true, false],
    ]);
  });

  it("counts SR and higher regional markers for a state filter, using the round end date", async () => {
    await insertCompetitionRoundDate({ competitionId: "Comp2024", eventId: "222", roundTypeId: "f", endDate: "2024-06-02" });

    await insertResult({ id: "nr", competitionId: "Comp2023", eventId: "333", personId: "2020AAAA01", best: 800, regionalSingleRecord: "NR" });
    await insertResult({ id: "sr", competitionId: "Comp2024", eventId: "222", personId: "2020AAAA01", roundTypeId: "f", best: 300, stateAverageRecord: "SR", average: 400 });
    await insertResult({ id: "other", competitionId: "Comp2024", eventId: "333", personId: "2020BBBB01", best: 700, stateSingleRecord: "SR" });

    const history = await getRecordHistory(recordsInput({ state: "Jalisco" }));

    expect(history.map((h) => [h.resultId, h.recordDate, h.isSingleRecord, h.isAverageRecord])).toEqual([
      ["sr", "2024-06-02", false, true],
      ["nr", "2023-06-01", true, false],
    ]);
  });
});
