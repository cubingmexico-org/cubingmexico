import { describe, expect, it } from "vitest";
import { recordBadgeClass } from "./record-badges";

describe("recordBadgeClass", () => {
  it("maps known record markers", () => {
    expect(recordBadgeClass("WR")).toContain("amber");
    expect(recordBadgeClass("NAR")).toContain("blue");
    expect(recordBadgeClass("NR")).toContain("green");
    expect(recordBadgeClass("SR")).toContain("violet");
    expect(recordBadgeClass("PR")).toContain("muted");
  });

  it("returns empty for unknown or null tags", () => {
    expect(recordBadgeClass(null)).toBe("");
    expect(recordBadgeClass(undefined)).toBe("");
    expect(recordBadgeClass("XYZ")).toBe("");
  });
});
