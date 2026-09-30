import { describe, expect, it } from "vitest";
import {
  applyWhatIfOverrides,
  parseAttemptInput,
  parseWhatIfParams,
} from "@/lib/attempt-input";
import {
  decodeMultiBlind,
  encodeMultiBlind,
  formatAttemptValue,
  formatTime333mbf,
} from "@/lib/utils";

describe("parseAttemptInput", () => {
  it("returns null for empty input", () => {
    expect(parseAttemptInput("333", "single", "  ")).toBeNull();
  });

  it("parses timed events", () => {
    expect(parseAttemptInput("333", "single", "9.8")).toBe(980);
    expect(parseAttemptInput("333", "single", "9.08")).toBe(908);
    expect(parseAttemptInput("333", "average", "12")).toBe(1200);
    expect(parseAttemptInput("444", "single", "1:02.34")).toBe(6234);
    expect(parseAttemptInput("555bf", "single", "1:01:02.34")).toBe(366234);
  });

  it("rejects malformed times", () => {
    expect(parseAttemptInput("333", "single", "abc")).toBe("invalid");
    expect(parseAttemptInput("333", "single", "9.123")).toBe("invalid");
    expect(parseAttemptInput("333", "single", "0")).toBe("invalid");
    expect(parseAttemptInput("333", "single", "1:2:3:4")).toBe("invalid");
  });

  it("round-trips formatted times", () => {
    for (const value of [908, 6234, 366234]) {
      const text = formatAttemptValue("333", value)!;
      expect(parseAttemptInput("333", "single", text)).toBe(value);
    }
  });

  it("parses FMC singles and means", () => {
    expect(parseAttemptInput("333fm", "single", "24")).toBe(24);
    expect(parseAttemptInput("333fm", "single", "24.5")).toBe("invalid");
    expect(parseAttemptInput("333fm", "average", "24.67")).toBe(2467);
    expect(parseAttemptInput("333fm", "average", "25")).toBe(2500);
  });

  it("parses multi-blind", () => {
    const value = parseAttemptInput("333mbf", "single", "10/12 45:30");
    expect(value).toBe(
      encodeMultiBlind({ solved: 10, attempted: 12, timeInSeconds: 2730 }),
    );
    expect(decodeMultiBlind(value as number)).toMatchObject({
      solved: 10,
      attempted: 12,
      timeInSeconds: 2730,
    });
    expect(formatTime333mbf(value as number)).toBe("10/12 45:30");
  });

  it("rejects invalid multi-blind", () => {
    expect(parseAttemptInput("333mbf", "single", "1/3 10:00")).toBe("invalid");
    expect(parseAttemptInput("333mbf", "single", "5/4 10:00")).toBe("invalid");
    expect(parseAttemptInput("333mbf", "single", "10")).toBe("invalid");
    expect(parseAttemptInput("333mbf", "average", "2/2 1:00")).toBe("invalid");
  });
});

describe("parseWhatIfParams", () => {
  it("reads known events and ignores the rest", () => {
    const overrides = parseWhatIfParams(
      {
        id: "2015ABCD01",
        "s.333": "980",
        "a.333": "",
        "s.444": "abc",
        "a.333mbf": "123",
        "s.unknown": "100",
      },
      ["333", "444", "333mbf"],
    );
    expect(overrides).toEqual({
      singles: { "333": 980 },
      averages: { "333": null },
    });
  });
});

describe("applyWhatIfOverrides", () => {
  it("replaces, adds and removes records", () => {
    const merged = applyWhatIfOverrides(
      { singles: { "333": 1000, "444": 4000 }, averages: { "333": 1200 } },
      { singles: { "333": 900, "222": 300 }, averages: { "333": null } },
    );
    expect(merged).toEqual({
      singles: { "333": 900, "444": 4000, "222": 300 },
      averages: {},
    });
  });
});
