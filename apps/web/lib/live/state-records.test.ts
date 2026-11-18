import { describe, expect, it } from "vitest";
import {
  attachLiveStateRecords,
  beatsOrTiesStateBest,
  liveStateRecordTag,
} from "./state-records";
import type { EnrichedLiveCompetitor, LiveResult } from "./types";

describe("beatsOrTiesStateBest", () => {
  it("treats the first valid time as a record when there is no bar", () => {
    expect(beatsOrTiesStateBest(1000, null)).toBe(true);
    expect(beatsOrTiesStateBest(1000, undefined)).toBe(true);
  });

  it("ties or beats a lower-is-better bar", () => {
    expect(beatsOrTiesStateBest(900, 1000)).toBe(true);
    expect(beatsOrTiesStateBest(1000, 1000)).toBe(true);
    expect(beatsOrTiesStateBest(1001, 1000)).toBe(false);
  });

  it("rejects DNF/DNS/empty", () => {
    expect(beatsOrTiesStateBest(0, null)).toBe(false);
    expect(beatsOrTiesStateBest(-1, null)).toBe(false);
    expect(beatsOrTiesStateBest(-2, 1000)).toBe(false);
  });
});

describe("liveStateRecordTag", () => {
  it("returns SR when the time beats the state bar", () => {
    expect(liveStateRecordTag(900, null, 1000)).toBe("SR");
  });

  it("suppresses SR when WCA already tagged NR/NAR/WR", () => {
    expect(liveStateRecordTag(900, "NR", 1000)).toBeNull();
    expect(liveStateRecordTag(900, "NAR", null)).toBeNull();
    expect(liveStateRecordTag(900, "WR", null)).toBeNull();
  });

  it("allows PR alongside SR", () => {
    expect(liveStateRecordTag(900, "PR", 1000)).toBe("SR");
  });

  it("returns null when the time does not improve", () => {
    expect(liveStateRecordTag(1100, null, 1000)).toBeNull();
    expect(liveStateRecordTag(-1, null, null)).toBeNull();
  });
});

describe("attachLiveStateRecords", () => {
  const competitor: EnrichedLiveCompetitor = {
    id: 10,
    user_id: 1,
    registrant_id: 1,
    name: "Ana",
    country_iso2: "MX",
    wca_id: "2015TEST01",
    stateId: "JAL",
    stateName: "Jalisco",
  };

  const result: LiveResult = {
    global_pos: 1,
    local_pos: 1,
    registration_id: 10,
    best: 900,
    average: 1000,
    single_record_tag: "PR",
    average_record_tag: null,
    advancing: true,
    advancing_questionable: false,
    last_attempt_entered_at: null,
    event_id: "333",
    attempts: [],
    result_id: 1,
    round_wcif_id: "333-r1",
  };

  it("attaches SR tags from state best maps", () => {
    const tags = attachLiveStateRecords(
      [result],
      new Map([[10, competitor]]),
      new Map([["JAL", 950]]),
      new Map([["JAL", 1100]]),
    );

    expect(tags[0]).toEqual({
      single_record_tag: "PR",
      average_record_tag: null,
      stateSingleRecord: "SR",
      stateAverageRecord: "SR",
    });
  });

  it("skips SR without a state assignment", () => {
    const tags = attachLiveStateRecords(
      [result],
      new Map([
        [
          10,
          { ...competitor, stateId: null, stateName: null },
        ],
      ]),
      new Map([["JAL", 950]]),
      new Map(),
    );

    expect(tags[0]!.stateSingleRecord).toBeNull();
    expect(tags[0]!.stateAverageRecord).toBeNull();
  });
});
