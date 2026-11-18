import { describe, expect, it } from "vitest";
import { recordBadgeClass, visibleRecordTags } from "./record-badges";

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

describe("visibleRecordTags", () => {
  it("keeps PR when it is the only tag", () => {
    expect(visibleRecordTags("PR", null)).toEqual(["PR"]);
  });

  it("hides PR when SR or a regional record is present", () => {
    expect(visibleRecordTags("PR", "SR")).toEqual(["SR"]);
    expect(visibleRecordTags("NR", null)).toEqual(["NR"]);
    expect(visibleRecordTags("PR", "NR")).toEqual(["NR"]);
    expect(visibleRecordTags("WR", "SR")).toEqual(["WR", "SR"]);
  });
});
