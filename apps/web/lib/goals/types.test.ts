import { describe, expect, it } from "vitest";
import { describeGoal } from "./format";
import { goalTargetSchema, tierIndex } from "./types";

describe("goalTargetSchema", () => {
  it("parses each goal type, coercing numbers from form values", () => {
    expect(
      goalTargetSchema.parse({
        type: "result",
        eventId: "333",
        kind: "average",
        value: "1000",
      }),
    ).toEqual({ type: "result", eventId: "333", kind: "average", value: 1000 });
    expect(
      goalTargetSchema.parse({
        type: "rank",
        eventId: "333",
        kind: "single",
        region: "state",
        maxRank: "10",
      }),
    ).toMatchObject({ maxRank: 10 });
    expect(
      goalTargetSchema.parse({ type: "count", metric: "podiums", value: 3 }),
    ).toMatchObject({ value: 3 });
    expect(
      goalTargetSchema.parse({ type: "mollerz", tier: "Oro" }),
    ).toMatchObject({ tier: "Oro" });
    expect(
      goalTargetSchema.parse({ type: "nemesis", maxNemeses: "0" }),
    ).toMatchObject({ maxNemeses: 0 });
    expect(
      goalTargetSchema.parse({ type: "custom", text: "  Aprender 4BLD " }),
    ).toMatchObject({ text: "Aprender 4BLD" });
  });

  it("limits only podium counts to one event", () => {
    const podiums = {
      type: "count",
      metric: "podiums",
      value: 3,
      eventId: "333",
    };
    expect(goalTargetSchema.parse(podiums)).toEqual(podiums);
    expect(
      goalTargetSchema.safeParse({ ...podiums, metric: "competitions" })
        .success,
    ).toBe(false);
  });

  it("rejects invalid targets", () => {
    const invalid = [
      { type: "result", eventId: "333", kind: "average", value: 0 },
      {
        type: "rank",
        eventId: "333",
        kind: "single",
        region: "world",
        maxRank: 1,
      },
      { type: "count", metric: "kinch", value: 3 },
      { type: "mollerz", tier: "Oro+" },
      { type: "nemesis", maxNemeses: -1 },
      { type: "custom", text: "   " },
      { type: "unknown" },
    ];
    for (const target of invalid) {
      expect(goalTargetSchema.safeParse(target).success).toBe(false);
    }
  });
});

describe("describeGoal", () => {
  it("formats result goals with the event's units", () => {
    expect(
      describeGoal(
        { type: "result", eventId: "333", kind: "average", value: 1000 },
        "3x3x3 Cube",
      ),
    ).toBe("Promedio de 3x3x3 Cube debajo de 10.00");
    expect(
      describeGoal(
        { type: "result", eventId: "333fm", kind: "single", value: 30 },
        "3x3x3 Fewest Moves",
      ),
    ).toBe("Single de 3x3x3 Fewest Moves debajo de 30");
  });

  it("describes the other goal types", () => {
    expect(describeGoal({ type: "nemesis", maxNemeses: 0 })).toBe(
      "Terminar el año sin némesis",
    );
    expect(
      describeGoal({ type: "count", metric: "competitions", value: 10 }),
    ).toBe("10 competencias en el año");
    expect(
      describeGoal(
        { type: "count", metric: "podiums", value: 3, eventId: "444" },
        "4x4x4 Cube",
      ),
    ).toBe("3 podios en 4x4x4 Cube en el año");
    expect(describeGoal({ type: "count", metric: "newStates", value: 2 })).toBe(
      "2 estados nuevos en el año",
    );
  });
});

describe("tierIndex", () => {
  it("orders tiers from Bronce to Diamante", () => {
    expect(tierIndex(null)).toBe(-1);
    expect(tierIndex("Bronce")).toBeLessThan(tierIndex("Oro"));
    expect(tierIndex("Ópalo")).toBeLessThan(tierIndex("Diamante"));
  });
});
