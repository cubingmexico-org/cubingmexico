import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assignSequentialRanks,
  type RankRecord,
} from "@/lib/assign-sequential-ranks";
import {
  markStateRecords,
  type StateRecordRow,
} from "@/lib/mark-state-records";

// The backend runs the same fixtures in apps/backend/tests/test_state_parity.py.
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/parity");

function loadCases<T>(file: string): T[] {
  const raw = readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  return (JSON.parse(raw) as { cases: T[] }).cases;
}

type StateRankCase = {
  name: string;
  input: RankRecord[];
  expected: (RankRecord & { stateRank: number })[];
};

type StateRecordCase = {
  name: string;
  rows: StateRecordRow[];
  expected: string[];
};

describe("state ranks parity fixtures", () => {
  it.each(loadCases<StateRankCase>("state-ranks.json"))(
    "$name",
    ({ input, expected }) => {
      expect(assignSequentialRanks(input)).toEqual(expected);
    },
  );
});

describe("state records parity fixtures", () => {
  it.each(loadCases<StateRecordCase>("state-records.json"))(
    "$name",
    ({ rows, expected }) => {
      const out: string[] = [];
      markStateRecords(rows, out);
      expect(out).toEqual(expected);
    },
  );
});
