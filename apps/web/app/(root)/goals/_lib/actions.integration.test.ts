import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { goal } from "@workspace/db/schema";
import { insertEvent, insertPerson } from "@/test/factories";
import { signIn } from "@/test/session";
import { MAX_GOALS_PER_YEAR } from "@/lib/goals/types";
import {
  createGoalAction,
  deleteGoalAction,
  setGoalCompletedAction,
  setGoalPublicAction,
  updateGoalAction,
} from "./actions";

const UNAUTHORIZED = { digest: "NEXT_HTTP_ERROR_FALLBACK;401" };

const ANA = "2015AAAA01";
const BETO = "2016BBBB01";
const ADMIN = "2010ADMN01";

const SUB_10 = { type: "result", eventId: "333", kind: "average", value: 1000 };
const CUSTOM = { type: "custom", text: "Aprender 4BLD" };

function setNow(iso: string) {
  vi.setSystemTime(new Date(iso));
}

async function goalsOf(wcaId: string) {
  return db.select().from(goal).where(eq(goal.personId, wcaId));
}

async function createOwnGoal(target: object = SUB_10, year = 2027) {
  expect(await createGoalAction(year, target)).toEqual({ ok: true });
  const rows = await goalsOf(ANA);
  return rows[rows.length - 1]!;
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow("2026-12-21T12:00:00Z");
  await insertEvent({ id: "333", name: "3x3x3 Cube", rank: 10 });
  await insertEvent({ id: "333ft", name: "3x3x3 With Feet", rank: 996 });
  await insertEvent({ id: "fto", name: "Face-Turning Octahedron", rank: 810 });
  await insertPerson({ wcaId: ANA });
  await insertPerson({ wcaId: BETO });
  await insertPerson({ wcaId: ADMIN });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createGoalAction", () => {
  it("requires a signed-in person", async () => {
    await expect(createGoalAction(2027, SUB_10)).rejects.toMatchObject(
      UNAUTHORIZED,
    );
  });

  it("creates next year's goals once the summary unlocks", async () => {
    signIn(ANA);
    await createOwnGoal();

    expect(await goalsOf(ANA)).toEqual([
      expect.objectContaining({
        year: 2027,
        type: "result",
        target: SUB_10,
        isPublic: false,
        completedAt: null,
      }),
    ]);
  });

  it("only accepts the year that is open for editing", async () => {
    signIn(ANA);
    expect(await createGoalAction(2026, SUB_10)).toMatchObject({ ok: false });
    expect(await createGoalAction(2028, SUB_10)).toMatchObject({ ok: false });

    setNow("2026-12-19T12:00:00Z");
    expect(await createGoalAction(2027, SUB_10)).toMatchObject({ ok: false });

    setNow("2027-01-31T12:00:00Z");
    expect(await createGoalAction(2027, SUB_10)).toEqual({ ok: true });

    setNow("2027-02-01T12:00:00Z");
    expect(await createGoalAction(2027, SUB_10)).toMatchObject({ ok: false });
    expect(await goalsOf(ANA)).toHaveLength(1);
  });

  it("lets superadmins set next year's goals before the unlock", async () => {
    vi.stubEnv("SUPERADMIN_WCA_IDS", ADMIN);
    setNow("2026-11-10T12:00:00Z");

    signIn(ADMIN);
    expect(await createGoalAction(2027, SUB_10)).toEqual({ ok: true });

    signIn(ANA);
    expect(await createGoalAction(2027, SUB_10)).toMatchObject({ ok: false });
  });

  it("rejects goals for events that aren't official", async () => {
    signIn(ANA);
    for (const eventId of ["333ft", "fto"]) {
      expect(await createGoalAction(2027, { ...SUB_10, eventId })).toEqual({
        ok: false,
        error: "Elige un evento oficial.",
      });
    }
    expect(
      await createGoalAction(2027, {
        type: "count",
        metric: "podiums",
        value: 3,
        eventId: "333ft",
      }),
    ).toEqual({ ok: false, error: "Elige un evento oficial." });
    expect(await goalsOf(ANA)).toEqual([]);
  });

  it("rejects malformed targets", async () => {
    signIn(ANA);
    expect(
      await createGoalAction(2027, {
        type: "count",
        metric: "kinch",
        value: 3,
      }),
    ).toEqual({ ok: false, error: "Revisa los datos de la meta." });
  });

  it(`allows at most ${MAX_GOALS_PER_YEAR} goals per year`, async () => {
    signIn(ANA);
    for (let i = 0; i < MAX_GOALS_PER_YEAR; i++) {
      expect(await createGoalAction(2027, CUSTOM)).toEqual({ ok: true });
    }
    expect(await createGoalAction(2027, CUSTOM)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/hasta 10 metas/),
    });
    expect(await goalsOf(ANA)).toHaveLength(MAX_GOALS_PER_YEAR);
  });
});

describe("goal ownership", () => {
  it("only lets the owner change or delete a goal", async () => {
    signIn(ANA);
    const own = await createOwnGoal();

    signIn(BETO);
    await expect(deleteGoalAction(own.id)).rejects.toMatchObject(UNAUTHORIZED);
    await expect(updateGoalAction(own.id, CUSTOM)).rejects.toMatchObject(
      UNAUTHORIZED,
    );
    await expect(setGoalPublicAction(own.id, true)).rejects.toMatchObject(
      UNAUTHORIZED,
    );
    await expect(setGoalCompletedAction(own.id, true)).rejects.toMatchObject(
      UNAUTHORIZED,
    );

    expect(await goalsOf(ANA)).toEqual([
      expect.objectContaining({ id: own.id, target: SUB_10, isPublic: false }),
    ]);
  });
});

describe("editing after the window closes", () => {
  it("locks edits and deletes but keeps the public toggle", async () => {
    signIn(ANA);
    const own = await createOwnGoal();

    setNow("2027-06-01T12:00:00Z");
    expect(await updateGoalAction(own.id, CUSTOM)).toMatchObject({ ok: false });
    expect(await deleteGoalAction(own.id)).toMatchObject({ ok: false });
    expect(await setGoalPublicAction(own.id, true)).toEqual({ ok: true });

    expect(await goalsOf(ANA)).toEqual([
      expect.objectContaining({ target: SUB_10, isPublic: true }),
    ]);
  });

  it("updates and deletes while the window is open", async () => {
    signIn(ANA);
    const own = await createOwnGoal();

    expect(await updateGoalAction(own.id, CUSTOM)).toEqual({ ok: true });
    expect(await goalsOf(ANA)).toEqual([
      expect.objectContaining({ type: "custom", target: CUSTOM }),
    ]);

    expect(await deleteGoalAction(own.id)).toEqual({ ok: true });
    expect(await goalsOf(ANA)).toEqual([]);
  });
});

describe("setGoalCompletedAction", () => {
  it("only completes custom goals, through the next January", async () => {
    signIn(ANA);
    const result = await createOwnGoal(SUB_10);
    const custom = await createOwnGoal(CUSTOM);

    expect(await setGoalCompletedAction(result.id, true)).toMatchObject({
      ok: false,
    });

    setNow("2027-08-01T12:00:00Z");
    expect(await setGoalCompletedAction(custom.id, true)).toEqual({ ok: true });
    expect(
      (await goalsOf(ANA)).find((g) => g.id === custom.id)?.completedAt,
    ).not.toBeNull();

    setNow("2028-01-31T12:00:00Z");
    expect(await setGoalCompletedAction(custom.id, false)).toEqual({
      ok: true,
    });

    setNow("2028-02-01T12:00:00Z");
    expect(await setGoalCompletedAction(custom.id, true)).toMatchObject({
      ok: false,
    });
    expect(
      (await goalsOf(ANA)).find((g) => g.id === custom.id)?.completedAt,
    ).toBeNull();
  });
});
