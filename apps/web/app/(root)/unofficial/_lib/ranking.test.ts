import { describe, expect, it } from "vitest";
import type { CcCompetitor } from "@/lib/cubing-contests";
import {
  countCcRankingStates,
  filterCcRanking,
  pickCcRecords,
  type CcRankingRow,
} from "./ranking";

function competitor(
  ccPersonId: number,
  name: string,
  stateName: string | null,
): CcCompetitor {
  return { ccPersonId, name, wcaId: null, stateName };
}

function row(
  key: string,
  value: number,
  countryRank: number,
  competitors: CcCompetitor[],
): CcRankingRow {
  return {
    key,
    value,
    countryRank,
    stateRank: null,
    resultId: Number(key.split("-")[0]),
    competitionId: "Comp",
    competitionName: "Comp",
    date: new Date("2024-01-01T00:00:00Z"),
    competitors,
  };
}

const rows = [
  row("1", 1000, 1, [competitor(1, "Ángel", "Jalisco")]),
  row("2", 1000, 1, [competitor(2, "Beto", "Jalisco")]),
  row("3-4", 1100, 3, [
    competitor(3, "Carla", "Jalisco"),
    competitor(4, "Dani", "Puebla"),
  ]),
  row("5", 1200, 4, [competitor(5, "Eva", null)]),
];
const base = { page: 1, perPage: 10, name: "", state: [] as string[] };

describe("filterCcRanking", () => {
  it("leaves state rank empty without a state filter", () => {
    const { data } = filterCcRanking(rows, base);
    expect(data.map((r) => r.stateRank)).toEqual([null, null, null, null]);
  });

  it("ranks within the selected states, sharing ties", () => {
    const { data } = filterCcRanking(rows, { ...base, state: ["Jalisco"] });
    expect(data.map((r) => [r.key, r.stateRank])).toEqual([
      ["1", 1],
      ["2", 1],
      ["3-4", 3],
    ]);
  });

  it("matches a team when any member is in the state", () => {
    const { data } = filterCcRanking(rows, { ...base, state: ["Puebla"] });
    expect(data.map((r) => [r.key, r.stateRank])).toEqual([["3-4", 1]]);
  });

  it("matches names without accents", () => {
    const { data } = filterCcRanking(rows, { ...base, name: "angel" });
    expect(data.map((r) => r.key)).toEqual(["1"]);
  });

  it("paginates", () => {
    const { data, pageCount } = filterCcRanking(rows, {
      ...base,
      perPage: 3,
      page: 2,
    });
    expect(pageCount).toBe(2);
    expect(data.map((r) => r.key)).toEqual(["5"]);
  });
});

describe("countCcRankingStates", () => {
  it("counts each row once per state", () => {
    expect(countCcRankingStates(rows)).toEqual({ Jalisco: 3, Puebla: 1 });
  });
});

describe("pickCcRecords", () => {
  it("returns every tied national record", () => {
    expect(pickCcRecords(rows, "").map((r) => r.key)).toEqual(["1", "2"]);
  });

  it("returns the state's best", () => {
    expect(pickCcRecords(rows, "Puebla").map((r) => r.key)).toEqual(["3-4"]);
  });

  it("returns nothing for a state without results", () => {
    expect(pickCcRecords(rows, "Sonora")).toEqual([]);
  });
});
