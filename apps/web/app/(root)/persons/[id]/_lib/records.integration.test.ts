import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertPerson,
  insertResult,
  insertRoundType,
  insertScopeEvents,
} from "@/test/factories";
import { getPersonPodiumsByEvent, getPersonPrStreaks } from "./records";

const WCA_ID = "2020STRK01";

beforeEach(async () => {
  await insertScopeEvents();
  await insertRoundType({ id: "f" });
  await insertPerson({ wcaId: WCA_ID });
  for (const [id, day] of [
    ["Comp1", "2024-01-01"],
    ["Comp2", "2024-02-01"],
    ["Comp3", "2024-03-01"],
  ] as const) {
    await insertCompetition({ id, startDate: new Date(`${day}T00:00:00Z`) });
  }
  const results = [
    ["Comp1", "333", 1000],
    // Slower 333; the only "PR" here is in an announced-but-unofficial event.
    ["Comp2", "333", 1100],
    ["Comp2", "fto", 500],
    // Slower 333; the only PR here is in a deprecated event.
    ["Comp3", "333", 1200],
    ["Comp3", "333ft", 900],
  ] as const;
  for (const [competitionId, eventId, best] of results) {
    await insertResult({
      id: `${competitionId}-${eventId}`,
      competitionId,
      eventId,
      personId: WCA_ID,
      best,
      pos: 1,
      roundTypeId: "f",
    });
  }
});

const ids = (streak: { competitionId: string }[]) =>
  streak.map((competition) => competition.competitionId);

describe("getPersonPrStreaks", () => {
  it("counts only official events by default", async () => {
    const streaks = await getPersonPrStreaks(WCA_ID, "official");

    expect(ids(streaks.longestStreak)).toEqual(["Comp1"]);
    expect(ids(streaks.currentStreak)).toEqual([]);
  });

  it("adds deprecated events, but never announced ones, in the all scope", async () => {
    const streaks = await getPersonPrStreaks(WCA_ID, "all");

    expect(ids(streaks.longestStreak)).toEqual(["Comp1"]);
    expect(ids(streaks.currentStreak)).toEqual(["Comp3"]);
  });
});

describe("getPersonPodiumsByEvent", () => {
  const events = (rows: { eventId: string }[]) =>
    rows.map((row) => row.eventId).sort();

  it("counts podiums in official events by default", async () => {
    const podiums = await getPersonPodiumsByEvent(WCA_ID, "official");

    expect(events(podiums)).toEqual(["333"]);
    expect(podiums[0]?.gold).toBe(3);
  });

  it("adds deprecated events, but never announced ones, in the all scope", async () => {
    const podiums = await getPersonPodiumsByEvent(WCA_ID, "all");

    expect(events(podiums)).toEqual(["333", "333ft"]);
  });
});
