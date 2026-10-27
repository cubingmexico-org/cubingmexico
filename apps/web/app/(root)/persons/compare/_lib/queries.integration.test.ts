import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertPerson,
  insertResult,
  insertRoundType,
  insertScopeEvents,
} from "@/test/factories";
import { getHeadToHeadResults } from "./queries";

beforeEach(async () => {
  await insertScopeEvents();
  await insertRoundType({ id: "f", rank: 90 });
  await insertPerson({ wcaId: "2020AAAA01" });
  await insertPerson({ wcaId: "2020BBBB01" });
  await insertCompetition({ id: "Comp2024" });

  for (const eventId of ["333", "333ft", "fto"]) {
    for (const [index, personId] of ["2020AAAA01", "2020BBBB01"].entries()) {
      await insertResult({
        id: `${eventId}-${personId}`,
        competitionId: "Comp2024",
        eventId,
        personId,
        roundTypeId: "f",
        pos: index + 1,
        best: 1000 + index,
      });
    }
  }
});

describe("getHeadToHeadResults", () => {
  it("compares only official events by default", async () => {
    const rounds = await getHeadToHeadResults("2020AAAA01", "2020BBBB01");
    expect(rounds.map((round) => round.eventId)).toEqual(["333"]);
  });

  it("adds deprecated events, and never fto", async () => {
    const rounds = await getHeadToHeadResults(
      "2020AAAA01",
      "2020BBBB01",
      "all",
    );
    expect(rounds.map((round) => round.eventId)).toEqual(["333", "333ft"]);
  });
});
