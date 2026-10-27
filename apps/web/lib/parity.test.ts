import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  markStateRecords,
  type StateRecordRow,
} from "@/lib/mark-state-records";

// `markStateRecords` tags UNR/USR for Cubing Contests results with the same
// rules the backend uses for official SR; apps/backend/tests/test_state_parity.py
// runs the same fixtures.
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/parity");

function loadCases<T>(file: string): T[] {
  const raw = readFileSync(path.join(FIXTURES_DIR, file), "utf-8");
  return (JSON.parse(raw) as { cases: T[] }).cases;
}

type StateRecordCase = {
  name: string;
  rows: StateRecordRow[];
  expected: string[];
};

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
