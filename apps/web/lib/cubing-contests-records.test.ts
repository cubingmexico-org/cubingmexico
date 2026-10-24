import { describe, expect, it } from "vitest";
import {
  computeCcRecordMarkers,
  type CcRecordInputRow,
} from "@/lib/cubing-contests-records";

function row(
  resultId: number,
  date: string,
  best: number,
  overrides: Partial<CcRecordInputRow> = {},
): CcRecordInputRow {
  return {
    resultId,
    eventId: "fto",
    date: `${date}T00:00:00Z`,
    best,
    average: 0,
    hasMexican: true,
    stateNames: ["Jalisco"],
    ...overrides,
  };
}

function singles(rows: CcRecordInputRow[]) {
  const { markers } = computeCcRecordMarkers(rows);
  return Object.fromEntries(
    rows.map((r) => [r.resultId, markers.get(r.resultId)?.single ?? null]),
  );
}

describe("computeCcRecordMarkers", () => {
  it("marks the first Mexican result and later improvements as UNR", () => {
    expect(
      singles([
        row(1, "2024-01-01", 3000),
        row(2, "2024-02-01", 3100),
        row(3, "2024-03-01", 2900),
      ]),
    ).toEqual({ 1: "UNR", 2: null, 3: "UNR" });
  });

  it("marks every tie for the day's best, and only the day's best", () => {
    expect(
      singles([
        row(1, "2024-01-01", 3000),
        row(2, "2024-02-01", 2800),
        row(3, "2024-02-01", 2800, { stateNames: ["Puebla"] }),
        row(4, "2024-02-01", 2900),
      ]),
    ).toEqual({ 1: "UNR", 2: "UNR", 3: "UNR", 4: null });
  });

  it("marks a state's first result as USR when it is not a UNR", () => {
    expect(
      singles([
        row(1, "2024-01-01", 2500),
        row(2, "2024-02-01", 3000, { stateNames: ["Puebla"] }),
        row(3, "2024-03-01", 3100, { stateNames: ["Puebla"] }),
      ]),
    ).toEqual({ 1: "UNR", 2: "USR", 3: null });
  });

  it("counts a team for every member's state", () => {
    const { history } = computeCcRecordMarkers([
      row(1, "2024-01-01", 2500, { stateNames: ["Jalisco"] }),
      row(2, "2024-02-01", 3000, { stateNames: ["Puebla", "Sonora"] }),
    ]);
    expect(
      history
        .filter((entry) => entry.type === "single")
        .map((entry) => [entry.resultId, entry.scope]),
    ).toEqual([
      [1, "national"],
      [1, "Jalisco"],
      [2, "Puebla"],
      [2, "Sonora"],
    ]);
  });

  it("ignores results without Mexican competitors", () => {
    expect(
      singles([
        row(1, "2024-01-01", 2000, { hasMexican: false, stateNames: [] }),
        row(2, "2024-02-01", 3000),
      ]),
    ).toEqual({ 1: null, 2: "UNR" });
  });

  it("keeps single and average progressions separate", () => {
    const { markers } = computeCcRecordMarkers([
      row(1, "2024-01-01", 3000, { average: 3500 }),
      row(2, "2024-02-01", 2900, { average: 3600 }),
    ]);
    expect(markers.get(1)).toEqual({ single: "UNR", average: "UNR" });
    expect(markers.get(2)).toEqual({ single: "UNR", average: null });
  });
});
