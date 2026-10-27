import { describe, expect, it } from "vitest";
import {
  assembleTeamAnnualSummary,
  type TeamSummaryDerived,
  type TeamSummarySectionRows,
} from "./assemble";

type Overrides = {
  hosted?: unknown[];
  season?: unknown[];
  travel?: unknown[];
  podiumsRecords?: unknown[];
  roster?: unknown[];
  staff?: unknown[];
  crossed?: { crossedTeamRows?: unknown[]; mostDiverseCompRows?: unknown[] };
};

function withDefaults(defaults: unknown[], overrides: unknown[] = []) {
  return defaults.map((value, index) =>
    index < overrides.length && overrides[index] !== undefined
      ? overrides[index]
      : value,
  );
}

// Tests only set the fields they check; the rest stay empty like a quiet year.
function rows(overrides: Overrides = {}): TeamSummarySectionRows {
  return {
    hosted: withDefaults(
      [undefined, [], undefined, undefined, [], undefined, [], []],
      overrides.hosted,
    ),
    season: withDefaults([undefined, [], []], overrides.season),
    travel: withDefaults([undefined, [], [], undefined], overrides.travel),
    podiumsRecords: withDefaults(
      [undefined, [], [], [], undefined, [], [], [], []],
      overrides.podiumsRecords,
    ),
    roster: withDefaults(
      [[], [], undefined, undefined, undefined, [], [], []],
      overrides.roster,
    ),
    staff: withDefaults([[], [], []], overrides.staff),
    crossed: {
      crossedTeamRows: overrides.crossed?.crossedTeamRows ?? [],
      mostDiverseCompRows: overrides.crossed?.mostDiverseCompRows ?? [],
    },
  } as unknown as TeamSummarySectionRows;
}

const derived: TeamSummaryDerived = {
  newcomers: 0,
  championshipPodiumRows: [],
  newDelegates: [],
  regionalRecords: [],
  kinchSor: {
    kinchBefore: 0,
    kinchAfter: 0,
    sorSingleBefore: 0,
    sorSingleAfter: 0,
    sorAverageBefore: 0,
    sorAverageAfter: 0,
  },
};

const team = {
  stateId: "JAL",
  name: "Team Jalisco",
  stateName: "Jalisco",
  image: null,
};

function assemble(overrides: Overrides, includePrevYear = false) {
  return assembleTeamAnnualSummary({
    team,
    year: 2025,
    includePrevYear,
    rows: rows(overrides),
    derived,
  });
}

describe("assembleTeamAnnualSummary", () => {
  it("returns null without hosted competitions or member activity", () => {
    expect(assemble({})).toBeNull();
  });

  it("builds the summary for a year with activity", () => {
    const summary = assemble({
      hosted: [
        {
          competitionCount: "2",
          firstCompetitionDate: "2025-02-01",
          lastCompetitionDate: null,
        },
        [{ id: "Big2025", name: "Big 2025", competitors: "120" }],
      ],
      podiumsRecords: [{ gold: "3", silver: "1", bronze: "0" }],
    });

    expect(summary?.hosted).toMatchObject({
      competitionCount: 2,
      firstCompetitionDate: "2025-02-01",
      lastCompetitionDate: null,
      biggestCompetition: { id: "Big2025", name: "Big 2025", competitors: 120 },
    });
    expect(summary?.members.podiums).toMatchObject({
      total: 4,
      gold: 3,
      silver: 1,
      bronze: 0,
    });
    expect(summary?.availableYears).toEqual([]);
  });

  it("only reports growth and retention when the previous year counts", () => {
    const overrides: Overrides = {
      season: [{ activeMembers: "10" }],
      roster: [
        [],
        [],
        { activeMembers: "8" },
        { competitionCount: "1" },
        undefined,
        [{ wcaId: "A" }, { wcaId: "B" }],
        [{ wcaId: "A" }, { wcaId: "C" }],
      ],
    };

    expect(assemble(overrides, true)?.members).toMatchObject({
      growth: {
        prevYear: 2024,
        activeMembersDelta: 2,
        hostedCompetitionsDelta: -1,
        podiumsDelta: 0,
      },
      retention: { previousActive: 8, returned: 1 },
    });
    expect(assemble(overrides, false)?.members).toMatchObject({
      growth: { prevYear: null, activeMembersDelta: null },
      retention: { previousActive: 0, returned: 0 },
    });
  });

  it("needs two members or teams for turnout and diversity highlights", () => {
    const summary = (memberCount: string, distinctTeams: string) =>
      assemble({
        season: [
          { activeMembers: "1" },
          [{ competitionId: "C", competitionName: "C", memberCount }],
        ],
        crossed: {
          mostDiverseCompRows: [
            { competitionId: "D", competitionName: "D", distinctTeams },
          ],
        },
      })!.members;

    expect(summary("1", "1")).toMatchObject({
      biggestTurnout: null,
      mostDiverseComp: null,
    });
    expect(summary("2", "3")).toMatchObject({
      biggestTurnout: { competitionId: "C", memberCount: 2 },
      mostDiverseComp: { competitionId: "D", distinctTeams: 3 },
    });
  });

  it("drops rows without a state and empty record counts", () => {
    const summary = assemble({
      hosted: [
        { competitionCount: "1" },
        [],
        undefined,
        undefined,
        [],
        undefined,
        [
          { stateId: null, stateName: null, competitors: "4" },
          { stateId: "CMX", stateName: "CDMX", competitors: "5" },
        ],
      ],
      podiumsRecords: [
        undefined,
        [],
        [],
        [
          {
            eventId: "333",
            eventName: "3x3x3",
            eventRank: 10,
            single: "0",
            average: "0",
          },
          {
            eventId: "222",
            eventName: "2x2x2",
            eventRank: 20,
            single: "1",
            average: "0",
          },
        ],
      ],
    });

    expect(summary?.hosted.visitors).toEqual([
      { stateId: "CMX", stateName: "CDMX", competitors: 5 },
    ]);
    expect(summary?.members.records.byEventSr.map((r) => r.eventId)).toEqual([
      "222",
    ]);
  });
});
