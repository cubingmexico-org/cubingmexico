import { describe, expect, it } from "vitest";
import {
  COARSE_RANK_TAGS,
  personStateRecordTags,
  stateMemberTags,
  tagsAfterStateRanksChange,
} from "@/lib/cache-tag-names";

describe("cache tags", () => {
  it("includes coarse rank parents", () => {
    expect(COARSE_RANK_TAGS).toContain("ranks-single");
    expect(COARSE_RANK_TAGS).toContain("ranks-average");
    expect(COARSE_RANK_TAGS).toContain("records");
  });

  it("builds state-scoped member tags", () => {
    expect(stateMemberTags("CMX")).toEqual([
      "members-list-CMX",
      "members-gender-count-CMX",
      "total-members-CMX",
      "team-podiums-CMX",
      "single-national-records-CMX",
      "average-national-records-CMX",
      "sosr-CMX-single",
      "sosr-CMX-average",
      "sosr-state-CMX",
    ]);
  });

  it("includes state tags and coarse parents after ranks change", () => {
    const tags = tagsAfterStateRanksChange("JAL");
    expect(tags).toContain("ranks-single");
    expect(tags).toContain("members-list-JAL");
    expect(tags).toContain("persons-without-state");
    expect(tags).toContain("kinch-ranks");
  });

  it("builds person-scoped tags after state records change", () => {
    expect(personStateRecordTags(["2015EXAM01", "2016TEST02"])).toEqual([
      "person-page-2015EXAM01",
      "person-data-2015EXAM01",
      "person-record-history-2015EXAM01",
      "person-page-2016TEST02",
      "person-data-2016TEST02",
      "person-record-history-2016TEST02",
    ]);
  });
});
