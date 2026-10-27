import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every query that counts, ranks or compares events must apply an event scope
// (.cursor/rules/official-events.mdc). A file that joins `events` has to use a
// scope helper from lib/official-events.ts, or be listed here as display-only.

const WEB_ROOT = path.resolve(__dirname, "..");
const SCANNED_DIRS = ["app", "db", "lib"];

const EVENTS_JOIN = /\bjoin\s+events\b|Join\(\s*event\b/i;
const SCOPE_HELPER =
  /\b(officialEventIdsSql|eventIdsSql|eventScopeFilter|isOfficialEvent|inOfficialEvents|inScopeEvents|crossEventIdsSql|crossEventIds)\b/;

const DISPLAY_ONLY: Record<string, string> = {
  "app/(root)/competitions/_lib/queries.ts":
    "competition list: event icons and the event filter",
  "app/(root)/competitions/[id]/_lib/queries.ts":
    "one competition's main-event results",
  "app/(root)/competitions/[id]/results/all/_lib/queries.ts":
    "one competition's results for an event",
  "app/(root)/competitions/[id]/results/podiums/_lib/queries.ts":
    "one competition's podiums",
  "app/(root)/competitions/[id]/results/py_person/_lib/queries.ts":
    "one competition's results grouped by person",
  "app/(root)/persons/[id]/_lib/competitions.ts":
    "a person's results and their event picker",
  "app/(root)/persons/[id]/_lib/record-history.ts":
    "a person's own NR/SR results, listed per event",
  "app/(root)/persons/[id]/_lib/championship-podiums.ts":
    "a person's championship podiums, listed per competition",
  "app/(root)/summary/[year]/[wcaId]/_lib/queries/podiums-solves.ts":
    "callers pass a filter that already restricts to official events",
  "app/(root)/teams/[stateId]/statistics/_lib/queries.ts":
    "a team's results list and its event picker",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(WEB_ROOT, dir), {
    recursive: true,
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isFile() &&
        /\.tsx?$/.test(entry.name) &&
        !/\.test\.tsx?$/.test(entry.name),
    )
    .map((entry) =>
      path
        .relative(WEB_ROOT, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join("/"),
    );
}

const unscopedJoins = SCANNED_DIRS.flatMap(sourceFiles).filter((file) => {
  const source = readFileSync(path.join(WEB_ROOT, file), "utf-8");
  return EVENTS_JOIN.test(source) && !SCOPE_HELPER.test(source);
});

describe("event scope guard", () => {
  it("scopes every query that joins events, unless it is display-only", () => {
    const missing = unscopedJoins.filter((file) => !(file in DISPLAY_ONLY));

    expect(
      missing,
      "Apply eventScopeFilter / inScopeEvents / eventIdsSql (lib/official-events.ts), or add the file to DISPLAY_ONLY with a reason",
    ).toEqual([]);
  });

  it("has no stale display-only entries", () => {
    const stale = Object.keys(DISPLAY_ONLY).filter(
      (file) => !unscopedJoins.includes(file),
    );

    expect(stale).toEqual([]);
  });
});
