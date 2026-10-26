import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { resultAttempts } from "@workspace/db/schema";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertResult,
  insertRoundType,
} from "@/test/factories";
import { getTeamCompetitionResults } from "./queries";

async function insertAttempts(resultId: string, values: number[]) {
  await db.insert(resultAttempts).values(
    values.map((value, index) => ({
      resultId,
      attemptNumber: index + 1,
      value,
    })),
  );
}

beforeEach(async () => {
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "222", name: "2x2x2 Cube", rank: 20 });
  await insertRoundType({ id: "f", rank: 90 });
  await insertPerson({ wcaId: "2020AAAA01", name: "Ana", stateId: "JAL" });
  await insertPerson({ wcaId: "2020BBBB01", name: "Beto", stateId: "JAL" });
  await insertPerson({ wcaId: "2020CCCC01", name: "Caro", stateId: "CMX" });
  await insertCompetition({
    id: "Comp2023",
    startDate: new Date("2023-06-01T00:00:00Z"),
  });
  await insertCompetition({
    id: "Comp2024",
    startDate: new Date("2024-06-01T00:00:00Z"),
  });

  const results = [
    ["r1", "Comp2023", "333", "2020AAAA01", 1, 900, [1000, 900, 950]],
    ["r2", "Comp2024", "333", "2020BBBB01", 1, 800, [800, 850, 820]],
    ["r3", "Comp2024", "333", "2020AAAA01", 2, 950, [950, 990, 1010]],
    ["r4", "Comp2024", "333", "2020CCCC01", 3, 700, [700, 710, 720]],
    ["r5", "Comp2024", "222", "2020AAAA01", 1, 300, [300, 310, 320]],
  ] as const;
  for (const [
    id,
    competitionId,
    eventId,
    personId,
    pos,
    best,
    solves,
  ] of results) {
    await insertResult({
      id,
      competitionId,
      eventId,
      personId,
      roundTypeId: "f",
      pos,
      best,
    });
    await insertAttempts(id, [...solves]);
  }
});

describe("getTeamCompetitionResults", () => {
  it("returns the team's results for one event with their attempts in order", async () => {
    const group = await getTeamCompetitionResults("JAL", "333");

    expect(group?.eventName).toBe("3x3x3 Cube");
    expect(
      group?.results.map((r) => [r.resultId, r.solves, r.isStateRecordSingle]),
    ).toEqual([
      ["r1", [1000, 900, 950], true],
      ["r2", [800, 850, 820], true],
      ["r3", [950, 990, 1010], false],
    ]);
  });

  it("returns null when the team has no results in the event", async () => {
    expect(await getTeamCompetitionResults("CMX", "222")).toBeNull();
  });
});
