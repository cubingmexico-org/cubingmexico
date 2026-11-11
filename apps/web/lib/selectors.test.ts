import { describe, expect, it } from "vitest";
import {
  rankTypeForEvent,
  shouldHideRankTypeSelector,
  toggleSelectedValue,
} from "./selectors";

describe("toggleSelectedValue", () => {
  it("clears the value when selecting the current selection", () => {
    expect(toggleSelectedValue("Jalisco", "Jalisco")).toBe("");
  });

  it("sets the value when selecting a different option", () => {
    expect(toggleSelectedValue("Jalisco", "CDMX")).toBe("CDMX");
  });

  it("sets the value when nothing is selected", () => {
    expect(toggleSelectedValue("", "Jalisco")).toBe("Jalisco");
  });
});

describe("shouldHideRankTypeSelector", () => {
  it("hides the selector for 333mbf", () => {
    expect(shouldHideRankTypeSelector("333mbf")).toBe(true);
  });

  it("shows the selector for other events", () => {
    expect(shouldHideRankTypeSelector("333")).toBe(false);
    expect(shouldHideRankTypeSelector("333fm")).toBe(false);
  });
});

describe("rankTypeForEvent", () => {
  it("always links 333mbf to single", () => {
    expect(rankTypeForEvent("333mbf", "average")).toBe("single");
    expect(rankTypeForEvent("333mbf", "single")).toBe("single");
  });

  it("keeps the rank type for other events", () => {
    expect(rankTypeForEvent("333", "average")).toBe("average");
    expect(rankTypeForEvent("333fm", "single")).toBe("single");
  });
});
