import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertResult,
  insertRoundType,
} from "@/test/factories";
import { getAnnualSummary } from "./queries";

const WCA_ID = "2015AAAA01";

beforeEach(async () => {
  await insertEvent({ id: "333", rank: 10 });
  await insertEvent({ id: "333ft", rank: 996 });
  await insertRoundType({ id: "f" });
  await insertPerson({ wcaId: WCA_ID, name: "Ana", stateId: "JAL" });
  await insertCompetition({
    id: "Early2018",
    startDate: new Date("2018-03-10T00:00:00Z"),
  });
  await insertCompetition({
    id: "Open2019",
    startDate: new Date("2019-05-10T00:00:00Z"),
  });

  await insertResult({
    id: "1",
    competitionId: "Early2018",
    eventId: "333",
    personId: WCA_ID,
    roundTypeId: "f",
    pos: 4,
    best: 1500,
    average: 1700,
  });
  await insertResult({
    id: "2",
    competitionId: "Early2018",
    eventId: "333ft",
    personId: WCA_ID,
    roundTypeId: "f",
    pos: 4,
    best: 6000,
    average: 7000,
  });
  await insertResult({
    id: "3",
    competitionId: "Open2019",
    eventId: "333",
    personId: WCA_ID,
    roundTypeId: "f",
    pos: 1,
    best: 1200,
    average: 1400,
  });
  await insertResult({
    id: "4",
    competitionId: "Open2019",
    eventId: "333ft",
    personId: WCA_ID,
    roundTypeId: "f",
    pos: 1,
    best: 5000,
    average: 6000,
  });
});

describe("getAnnualSummary", () => {
  it("counts only official events in event-level stats", async () => {
    const summary = await getAnnualSummary(WCA_ID, 2019);

    expect(summary).not.toBeNull();
    expect(summary!.competitionCount).toBe(1);
    expect(summary!.eventCount).toBe(1);
    expect(summary!.roundCount).toBe(1);
    expect(summary!.podiums.byEvent.map((row) => row.eventId)).toEqual(["333"]);
    expect(summary!.podiums.gold).toBe(1);
    expect(summary!.personalBests.byEvent.map((row) => row.eventId)).toEqual([
      "333",
    ]);
    expect(
      summary!.personalBests.singleImprovements.map((row) => row.eventId),
    ).toEqual(["333"]);
  });

  it("measures single and average improvements against the best before the year", async () => {
    const summary = await getAnnualSummary(WCA_ID, 2019);

    expect(summary!.personalBests).toMatchObject({
      totalBreaks: 2,
      singleBreaks: 1,
      averageBreaks: 1,
    });
    expect(summary!.personalBests.singleImprovements).toEqual([
      {
        eventId: "333",
        eventName: "333",
        eventRank: 10,
        before: 1500,
        during: 1200,
        improvement: 300,
        improvementPercent: 20,
      },
    ]);
    expect(summary!.personalBests.averageImprovements).toEqual([
      expect.objectContaining({ before: 1700, during: 1400, improvement: 300 }),
    ]);
  });

  it("still counts a competition where only deprecated events were held", async () => {
    await insertCompetition({
      id: "FeetOnly2019",
      startDate: new Date("2019-08-10T00:00:00Z"),
    });
    await insertResult({
      id: "5",
      competitionId: "FeetOnly2019",
      eventId: "333ft",
      personId: WCA_ID,
      roundTypeId: "f",
      pos: 2,
      best: 4500,
      average: 5500,
    });

    const summary = await getAnnualSummary(WCA_ID, 2019);

    expect(summary!.competitionCount).toBe(2);
    expect(summary!.eventCount).toBe(1);
    expect(summary!.podiums.silver).toBe(0);
  });
});
