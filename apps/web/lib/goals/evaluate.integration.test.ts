import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { goal, type GoalTarget } from "@workspace/db/schema";
import {
  insertCompetition,
  insertEvent,
  insertPerson,
  insertResult,
  insertRoundType,
} from "@/test/factories";
import { countNemesesAsOf } from "@/app/(root)/persons/_lib/nemesis-queries";
import { getGoalViews, goalAsOfDay } from "./evaluate";

const ANA = "2015AAAA01";
const BETO = "2016BBBB01";
const YEAR_END = "2019-12-31";

let nextGoalId = 1;
let nextResultId = 1;

async function addGoal(
  target: GoalTarget,
  values: Partial<typeof goal.$inferInsert> = {},
) {
  const id = `00000000-0000-4000-8000-${String(nextGoalId++).padStart(12, "0")}`;
  await db.insert(goal).values({
    id,
    personId: ANA,
    year: 2019,
    type: target.type,
    target,
    ...values,
  });
  return id;
}

async function addResult(values: {
  competitionId: string;
  personId: string;
  eventId?: string;
  best?: number;
  average?: number;
  pos?: number;
  roundTypeId?: string;
  regionalSingleRecord?: string;
}) {
  await insertResult({
    id: String(nextResultId++),
    eventId: "333",
    roundTypeId: "f",
    pos: 5,
    ...values,
  });
}

async function evaluate(asOfDay = YEAR_END) {
  const views = await getGoalViews(ANA, 2019, asOfDay);
  return views.map((view) => ({ label: view.label, achieved: view.achieved }));
}

beforeEach(async () => {
  nextGoalId = 1;
  nextResultId = 1;
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "333ft", name: "3x3x3 With Feet", rank: 996 });
  await insertEvent({ id: "fto", name: "Face-Turning Octahedron", rank: 810 });
  await insertRoundType({ id: "f" });
  await insertPerson({ wcaId: ANA, name: "Ana", stateId: "JAL" });
  await insertPerson({ wcaId: BETO, name: "Beto", stateId: "CMX" });
  await insertCompetition({
    id: "Open2018",
    startDate: new Date("2018-05-10T00:00:00Z"),
    stateId: "JAL",
  });
  await insertCompetition({
    id: "Open2019",
    startDate: new Date("2019-05-10T00:00:00Z"),
    stateId: "JAL",
  });
  await insertCompetition({
    id: "Fall2019",
    startDate: new Date("2019-10-10T00:00:00Z"),
    stateId: "CMX",
  });
  await insertCompetition({
    id: "Open2020",
    startDate: new Date("2020-02-10T00:00:00Z"),
    stateId: "JAL",
  });
});

describe("goalAsOfDay", () => {
  it("uses today while the year runs and Dec 31 once it's over", () => {
    expect(goalAsOfDay(2027, new Date("2027-06-15T18:00:00Z"))).toBe(
      "2027-06-15",
    );
    expect(goalAsOfDay(2027, new Date("2028-01-05T00:00:00Z"))).toBe(
      "2027-12-31",
    );
  });
});

describe("getGoalViews", () => {
  it("checks result goals against the year's official results only", async () => {
    await addResult({
      competitionId: "Open2018",
      personId: ANA,
      best: 800,
      average: 900,
    });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1100,
      average: 1250,
    });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      eventId: "333ft",
      best: 500,
      average: 600,
    });
    await addResult({
      competitionId: "Open2020",
      personId: ANA,
      best: 700,
      average: 800,
    });

    await addGoal({
      type: "result",
      eventId: "333",
      kind: "average",
      value: 1300,
    });
    await addGoal({
      type: "result",
      eventId: "333",
      kind: "average",
      value: 1000,
    });
    await addGoal({
      type: "result",
      eventId: "333ft",
      kind: "single",
      value: 1000,
    });

    expect(await evaluate()).toEqual([
      { label: "Promedio de 3x3x3 Cube debajo de 13.00", achieved: true },
      // The 2018 and 2020 averages are faster but outside the year.
      { label: "Promedio de 3x3x3 Cube debajo de 10.00", achieved: false },
      // Deprecated events never count.
      { label: "Single de 333ft debajo de 10.00", achieved: false },
    ]);
  });

  it("ranks the person as of the evaluation day", async () => {
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1000,
      average: 1100,
    });
    await addResult({
      competitionId: "Open2019",
      personId: BETO,
      best: 900,
      average: 1000,
    });

    await addGoal({
      type: "rank",
      eventId: "333",
      kind: "single",
      region: "national",
      maxRank: 1,
    });
    await addGoal({
      type: "rank",
      eventId: "333",
      kind: "single",
      region: "national",
      maxRank: 2,
    });
    // Beto is in another state, so Ana leads Jalisco.
    await addGoal({
      type: "rank",
      eventId: "333",
      kind: "single",
      region: "state",
      maxRank: 1,
    });

    expect((await evaluate()).map((v) => v.achieved)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it("counts activity in the year, with event-level counts limited to official events", async () => {
    await addResult({
      competitionId: "Open2018",
      personId: ANA,
      best: 1500,
      average: 1600,
      pos: 1,
    });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1200,
      average: 1300,
      pos: 1,
      regionalSingleRecord: "NR",
    });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      eventId: "333ft",
      best: 5000,
      average: 6000,
      pos: 1,
    });
    // A competition where only a deprecated event was held still counts as a competition.
    await addResult({
      competitionId: "Fall2019",
      personId: ANA,
      eventId: "333ft",
      best: 4000,
      average: 5000,
      pos: 2,
    });

    await addGoal({ type: "count", metric: "competitions", value: 2 });
    await addGoal({ type: "count", metric: "states", value: 2 });
    await addGoal({ type: "count", metric: "podiums", value: 2 });
    await addGoal({ type: "count", metric: "wins", value: 1 });
    await addGoal({ type: "count", metric: "events", value: 2 });
    await addGoal({ type: "count", metric: "records", value: 1 });
    await addGoal({ type: "count", metric: "prs", value: 2 });

    const views = await getGoalViews(ANA, 2019, YEAR_END);
    expect(views.map((v) => [v.target, v.achieved, v.progress])).toEqual([
      [
        expect.objectContaining({ metric: "competitions" }),
        true,
        "2 de 2 competencias",
      ],
      [
        expect.objectContaining({ metric: "states" }),
        true,
        "2 de 2 estados visitados",
      ],
      [expect.objectContaining({ metric: "podiums" }), false, "1 de 2 podios"],
      [
        expect.objectContaining({ metric: "wins" }),
        true,
        "1 de 1 primeros lugares",
      ],
      [
        expect.objectContaining({ metric: "events" }),
        false,
        "1 de 2 eventos distintos",
      ],
      [
        expect.objectContaining({ metric: "records" }),
        true,
        "1 de 1 récords (SR, NR, CR o WR)",
      ],
      [
        expect.objectContaining({ metric: "prs" }),
        true,
        "2 de 2 récords personales",
      ],
    ]);
  });

  it("counts states visited for the first time in the year", async () => {
    await insertCompetition({
      id: "Puebla2019",
      startDate: new Date("2019-11-10T00:00:00Z"),
      stateId: "PUE",
    });
    // Jalisco was visited in 2018; Ciudad de México and Puebla are new in 2019.
    await addResult({ competitionId: "Open2018", personId: ANA, best: 1500 });
    await addResult({ competitionId: "Open2019", personId: ANA, best: 1400 });
    await addResult({
      competitionId: "Fall2019",
      personId: ANA,
      eventId: "333ft",
      best: 4000,
    });
    await addResult({ competitionId: "Puebla2019", personId: ANA, best: 1300 });

    await addGoal({ type: "count", metric: "newStates", value: 2 });
    await addGoal({ type: "count", metric: "newStates", value: 3 });

    const views = await getGoalViews(ANA, 2019, YEAR_END);
    expect(views.map((v) => [v.achieved, v.progress])).toEqual([
      [true, "2 de 2 estados nuevos"],
      [false, "2 de 3 estados nuevos"],
    ]);
  });

  it("counts podiums in a single official event", async () => {
    await insertEvent({ id: "444", name: "4x4x4 Cube", rank: 20 });
    await insertRoundType({ id: "1" });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1000,
      pos: 1,
    });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      eventId: "444",
      best: 5000,
      pos: 2,
    });
    await addResult({
      competitionId: "Fall2019",
      personId: ANA,
      eventId: "444",
      best: 4800,
      pos: 3,
    });
    // Not a podium: first round, and outside the year.
    await addResult({
      competitionId: "Fall2019",
      personId: ANA,
      eventId: "444",
      best: 4900,
      pos: 1,
      roundTypeId: "1",
    });
    await addResult({
      competitionId: "Open2020",
      personId: ANA,
      eventId: "444",
      best: 4700,
      pos: 1,
    });

    await addGoal({
      type: "count",
      metric: "podiums",
      value: 2,
      eventId: "444",
    });
    await addGoal({
      type: "count",
      metric: "podiums",
      value: 2,
      eventId: "333",
    });

    const views = await getGoalViews(ANA, 2019, YEAR_END);
    expect(views.map((v) => [v.label, v.achieved, v.progress])).toEqual([
      ["2 podios en 4x4x4 Cube en el año", true, "2 de 2 podios en 4x4x4 Cube"],
      [
        "2 podios en 3x3x3 Cube en el año",
        false,
        "1 de 2 podios en 3x3x3 Cube",
      ],
    ]);
  });

  it("computes Kinch and Sum of Ranks from official PBs as of the evaluation day", async () => {
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1000,
      average: 1100,
    });
    await addResult({
      competitionId: "Open2019",
      personId: BETO,
      best: 900,
      average: 1000,
    });
    // Deprecated events and results after the year don't count.
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      eventId: "333ft",
      best: 3000,
      average: 3500,
    });
    await addResult({
      competitionId: "Open2020",
      personId: ANA,
      best: 800,
      average: 850,
    });

    await addGoal({ type: "kinch", minScore: 90.91 });
    await addGoal({ type: "kinch", minScore: 95 });
    await addGoal({ type: "sor", kind: "single", maxSum: 2 });
    await addGoal({ type: "sor", kind: "average", maxSum: 1 });

    const views = await getGoalViews(ANA, 2019, YEAR_END);
    expect(views.map((v) => [v.label, v.achieved, v.progress])).toEqual([
      ["Kinch de al menos 90.91", true, "Kinch actual: 90.91"],
      ["Kinch de al menos 95.00", false, "Kinch actual: 90.91"],
      [
        "Sum of Ranks (single) de 2 o menos",
        true,
        "Sum of Ranks (single) actual: 2",
      ],
      [
        "Sum of Ranks (average) de 1 o menos",
        false,
        "Sum of Ranks (average) actual: 2",
      ],
    ]);
  });

  it("compares the Mollerz tier reached by the evaluation day", async () => {
    await addResult({
      competitionId: "Open2020",
      personId: ANA,
      best: 1000,
      average: 1100,
    });
    await addGoal({ type: "mollerz", tier: "Bronce" });
    await addGoal({ type: "mollerz", tier: "Plata" });

    // Membership needs a result in every official event by the evaluation day.
    expect((await evaluate()).map((v) => v.achieved)).toEqual([false, false]);

    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1200,
      average: 1300,
    });
    expect((await evaluate()).map((v) => v.achieved)).toEqual([true, false]);
  });

  it("counts nemeses with the results known on the evaluation day", async () => {
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1000,
      average: 1100,
    });
    await addResult({
      competitionId: "Open2019",
      personId: BETO,
      best: 1050,
      average: 1000,
    });
    await addResult({
      competitionId: "Open2020",
      personId: BETO,
      best: 900,
      average: 950,
    });

    await addGoal({ type: "nemesis", maxNemeses: 0 });

    expect((await evaluate()).map((v) => v.achieved)).toEqual([true]);
    expect(
      await countNemesesAsOf(ANA, new Date("2019-12-31T00:00:00Z")),
    ).toEqual({
      slotCount: 2,
      nemesisCount: 0,
    });
    expect(
      await countNemesesAsOf(ANA, new Date("2020-12-31T00:00:00Z")),
    ).toEqual({
      slotCount: 2,
      nemesisCount: 1,
    });
  });

  it("ignores deprecated events when building nemesis slots", async () => {
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      best: 1000,
      average: 1100,
    });
    await addResult({
      competitionId: "Open2019",
      personId: ANA,
      eventId: "333ft",
      best: 3000,
      average: 3500,
    });
    await addResult({
      competitionId: "Open2019",
      personId: BETO,
      best: 900,
      average: 1000,
    });

    expect(
      await countNemesesAsOf(ANA, new Date("2019-12-31T00:00:00Z")),
    ).toEqual({
      slotCount: 2,
      nemesisCount: 1,
    });
  });

  it("marks custom goals done only when the owner completed them", async () => {
    await addGoal({ type: "custom", text: "Aprender 4BLD" });
    await addGoal(
      { type: "custom", text: "Ir al Nacional" },
      { completedAt: new Date("2019-11-01T00:00:00Z") },
    );

    expect(await evaluate()).toEqual([
      { label: "Aprender 4BLD", achieved: false },
      { label: "Ir al Nacional", achieved: true },
    ]);
  });
});
