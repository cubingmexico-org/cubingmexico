import { describe, expect, it } from "vitest";
import {
  requireEventId,
  requireStateId,
  requireWcaId,
} from "@/lib/action-input";

describe("requireWcaId", () => {
  it("returns the normalized WCA ID", () => {
    expect(requireWcaId("2015ABCD01")).toBe("2015ABCD01");
    expect(requireWcaId(" 2015abcd01 ")).toBe("2015ABCD01");
  });

  it("rejects malformed or non-string values", () => {
    for (const value of [
      "",
      "2015ABC01",
      "2015ABCD011",
      "'; DROP",
      2015,
      null,
      undefined,
      ["2015ABCD01"],
    ]) {
      expect(() => requireWcaId(value)).toThrow("Invalid WCA ID");
    }
  });
});

describe("requireStateId", () => {
  it("accepts known state ids", () => {
    expect(requireStateId("CMX")).toBe("CMX");
    expect(requireStateId("JAL")).toBe("JAL");
  });

  it("rejects unknown or non-string values", () => {
    for (const value of ["", "XXX", "MEX-CMX", 1, null, undefined]) {
      expect(() => requireStateId(value)).toThrow("Invalid state id");
    }
  });
});

describe("requireEventId", () => {
  it("accepts event id formats", () => {
    for (const value of ["333", "333mbf", "pyram", "sq1", "magic", "333ft"]) {
      expect(requireEventId(value)).toBe(value);
    }
  });

  it("rejects malformed or non-string values", () => {
    for (const value of [
      "",
      "3",
      "333MBF",
      "333 bf",
      "a".repeat(11),
      "333;",
      333,
      null,
    ]) {
      expect(() => requireEventId(value)).toThrow("Invalid event id");
    }
  });
});
