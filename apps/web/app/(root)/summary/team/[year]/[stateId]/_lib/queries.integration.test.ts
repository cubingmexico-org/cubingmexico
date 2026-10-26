import { db } from "@workspace/db";
import { team } from "@workspace/db/schema";
import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertResult,
  insertRoundType,
} from "@/test/factories";
import { getTeamAnnualSummary } from "./queries";

beforeEach(async () => {
  await insertEvent({ id: "333", rank: 10 });
  await insertEvent({ id: "333ft", rank: 996 });
  await insertRoundType({ id: "f" });
  await db.insert(team).values({ stateId: "JAL", name: "Jalisco" });
  await insertPerson({ wcaId: "2015AAAA01", name: "Ana", stateId: "JAL" });
  await insertCompetition({
    id: "Guadalajara2019",
    stateId: "JAL",
    startDate: new Date("2019-05-10T00:00:00Z"),
  });

  await insertResult({
    id: "1",
    competitionId: "Guadalajara2019",
    eventId: "333",
    personId: "2015AAAA01",
    roundTypeId: "f",
    pos: 1,
    best: 1200,
    average: 1400,
  });
  await insertResult({
    id: "2",
    competitionId: "Guadalajara2019",
    eventId: "333ft",
    personId: "2015AAAA01",
    roundTypeId: "f",
    pos: 1,
    best: 5000,
    average: 6000,
    regionalSingleRecord: "NR",
  });
});

describe("getTeamAnnualSummary", () => {
  it("counts only official events in event-level stats", async () => {
    const summary = await getTeamAnnualSummary("JAL", 2019);

    expect(summary).not.toBeNull();
    expect(summary!.members.season.competitionCount).toBe(1);
    expect(summary!.members.season.eventCount).toBe(1);
    expect(summary!.members.season.roundCount).toBe(1);
    expect(summary!.members.podiums.gold).toBe(1);
    expect(summary!.members.dominantEvents.map((row) => row.eventId)).toEqual([
      "333",
    ]);
    expect(summary!.members.records.nr).toBe(0);
    expect(summary!.members.records.regionalRecords).toEqual([]);
    expect(summary!.hosted.popularEvents.map((row) => row.eventId)).toEqual([
      "333",
    ]);
  });
});
