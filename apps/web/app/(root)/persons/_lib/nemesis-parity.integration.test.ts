import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { EventScope } from "@/lib/constants";
import {
  insertEvent,
  insertPerson,
  insertRankAverage,
  insertRankSingle,
} from "@/test/factories";
import {
  getNemesisReport,
  getNemesizedReport,
  type NemesisSlot,
  type PersonNemesis,
} from "./nemesis-queries";

// The backend checks the same fixture against its nemesis_stats job in
// apps/backend/tests_integration/test_rankings_jobs.py.
type ListEntry = {
  wcaId: string;
  type: "single" | "average";
  eventId: string;
};

type NemesisFixture = {
  events: { id: string; rank: number }[];
  persons: string[];
  ranks: {
    personId: string;
    type: "single" | "average";
    eventId: string;
    best: number;
  }[];
  expected: Record<
    EventScope,
    Record<
      string,
      { nemesisCount: number; nemesizedCount: number; slotCount: number }
    >
  >;
  expectedLists: Record<
    EventScope,
    Record<
      string,
      {
        nemeses: ListEntry[];
        almostNemeses: ListEntry[];
        victims: ListEntry[];
        almostVictims: ListEntry[];
      }
    >
  >;
};

const fixture = JSON.parse(
  readFileSync(
    path.resolve(__dirname, "../../../../../../fixtures/parity/nemesis.json"),
    "utf-8",
  ),
) as NemesisFixture;

function entries(
  people: (PersonNemesis & { closest?: NemesisSlot; missing?: NemesisSlot })[],
): ListEntry[] {
  return people
    .map(({ wcaId, closest, missing }) => {
      const slot = closest ?? missing;
      if (!slot) throw new Error(`${wcaId} has no slot`);
      return { wcaId, type: slot.type, eventId: slot.eventId };
    })
    .sort((a, b) => a.wcaId.localeCompare(b.wcaId));
}

beforeEach(async () => {
  for (const event of fixture.events) {
    await insertEvent(event);
  }
  for (const wcaId of fixture.persons) {
    await insertPerson({ wcaId });
  }
  for (const { type, ...rank } of fixture.ranks) {
    await (type === "single" ? insertRankSingle : insertRankAverage)(rank);
  }
});

describe.each(["official", "all"] as const)("nemesis parity (%s)", (scope) => {
  it.each(fixture.persons)("%s", async (wcaId) => {
    const nemeses = await getNemesisReport(wcaId, scope);
    const nemesized = await getNemesizedReport(wcaId, scope);

    expect({
      nemesisCount: nemeses.nemeses.length,
      nemesizedCount: nemesized.victimsTotal,
      slotCount: nemeses.slotCount,
    }).toEqual(fixture.expected[scope][wcaId]);

    expect({
      nemeses: entries(nemeses.nemeses),
      almostNemeses: entries(nemeses.almost),
      victims: entries(nemesized.victims),
      almostVictims: entries(nemesized.almost),
    }).toEqual(fixture.expectedLists[scope][wcaId]);
  });
});
