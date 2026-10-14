import { beforeEach, describe, expect, it } from "vitest";
import { insertEvent, insertPerson, insertRankSingle } from "@/test/factories";
import {
  findNemesisReport,
  getNemesisReport,
  getNemesizedReport,
} from "./nemesis-queries";

beforeEach(async () => {
  await insertEvent({ id: "333", rank: 10 });
  await insertEvent({ id: "222", rank: 20 });
  await insertEvent({ id: "fto", rank: 810 });
  await insertEvent({ id: "333ft", rank: 996 });

  for (const wcaId of [
    "2020AAAA01",
    "2020BBBB01",
    "2020CCCC01",
    "2020DDDD01",
  ]) {
    await insertPerson({ wcaId });
  }

  // Target: official 333 + 222, plus a deprecated 333ft slot.
  await insertRankSingle({ personId: "2020AAAA01", eventId: "333", best: 600 });
  await insertRankSingle({ personId: "2020AAAA01", eventId: "222", best: 300 });
  await insertRankSingle({
    personId: "2020AAAA01",
    eventId: "333ft",
    best: 5000,
  });

  // Beats the target in every official slot but has no 333ft result.
  await insertRankSingle({ personId: "2020BBBB01", eventId: "333", best: 500 });
  await insertRankSingle({ personId: "2020BBBB01", eventId: "222", best: 250 });

  // Beats the target everywhere, including 333ft.
  await insertRankSingle({ personId: "2020CCCC01", eventId: "333", best: 550 });
  await insertRankSingle({ personId: "2020CCCC01", eventId: "222", best: 280 });
  await insertRankSingle({
    personId: "2020CCCC01",
    eventId: "333ft",
    best: 4000,
  });

  // Beaten by the target in 333; also has an fto result the target lacks.
  await insertRankSingle({ personId: "2020DDDD01", eventId: "333", best: 700 });
  await insertRankSingle({
    personId: "2020DDDD01",
    eventId: "fto",
    best: 3000,
  });
});

describe("nemesis queries ignore unofficial events", () => {
  it("only counts official slots when finding nemeses", async () => {
    const report = await getNemesisReport("2020AAAA01");

    expect(report.slotCount).toBe(2);
    expect(report.nemeses.map((n) => n.wcaId).sort()).toEqual([
      "2020BBBB01",
      "2020CCCC01",
    ]);
    expect(report.almost).toEqual([]);
  });

  it("drops unofficial events from what-if targets", async () => {
    const report = await findNemesisReport({
      singles: { "333": 600, "222": 300, "333ft": 5000 },
      averages: {},
      excludeWcaId: "2020AAAA01",
    });

    expect(report.slotCount).toBe(2);
    expect(report.nemeses.map((n) => n.wcaId).sort()).toEqual([
      "2020BBBB01",
      "2020CCCC01",
    ]);
  });

  it("only counts the victim's official slots when finding nemesized", async () => {
    const report = await getNemesizedReport("2020AAAA01");

    expect(report.victims.map((v) => v.wcaId)).toEqual(["2020DDDD01"]);
    expect(report.victimsTotal).toBe(1);
    expect(report.almost).toEqual([]);
  });
});
