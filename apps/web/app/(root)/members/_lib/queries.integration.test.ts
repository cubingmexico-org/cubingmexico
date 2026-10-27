import { beforeEach, describe, expect, it } from "vitest";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertResult,
} from "@/test/factories";
import { getAlmostBronzeMembers, getMollerzMembers } from "./queries";

let resultId = 0;

async function solve(personId: string, eventId: string) {
  resultId += 1;
  await insertResult({
    id: `r${resultId}`,
    competitionId: "Comp2024",
    eventId,
    personId,
    best: 1000,
  });
}

beforeEach(async () => {
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "444", name: "4x4x4 Cube", rank: 30 });
  await insertEvent({ id: "333ft", name: "3x3x3 With Feet", rank: 996 });
  await insertEvent({ id: "fto", name: "Face-Turning Octahedron", rank: 810 });
  await insertCompetition({ id: "Comp2024" });

  await insertPerson({
    wcaId: "2020ALL001",
    name: "Ana Completa",
    stateId: "JAL",
  });
  await insertPerson({
    wcaId: "2020ALMO01",
    name: "Beto Casi",
    stateId: "CMX",
  });

  await solve("2020ALL001", "333");
  await solve("2020ALL001", "444");

  // Deprecated and not-yet-official events never count towards Mollerz.
  await solve("2020ALMO01", "333");
  await solve("2020ALMO01", "333ft");
  await solve("2020ALMO01", "fto");
});

describe("getMollerzMembers", () => {
  it("lists people with a result in every official event", async () => {
    const members = await getMollerzMembers("national");
    expect(members.map((member) => [member.wcaId, member.state])).toEqual([
      ["2020ALL001", "Jalisco"],
    ]);
  });
});

describe("getAlmostBronzeMembers", () => {
  it("lists people missing exactly one official event", async () => {
    const members = await getAlmostBronzeMembers();
    expect(members).toEqual([
      expect.objectContaining({
        wcaId: "2020ALMO01",
        completedCount: 1,
        totalEvents: 2,
        missingEvent: expect.objectContaining({ id: "444" }),
      }),
    ]);
  });
});
