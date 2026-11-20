import { afterEach, describe, expect, it, vi } from "vitest";
import {
  competitionsTableLiveHref,
  cubingMexicoLiveUrl,
  officialLiveUrl,
  parseScoretakingSoftware,
  wcaClassicLiveUrl,
  wcaIlrLiveUrl,
} from "./urls";

describe("live urls", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds ILR and classic Live URLs", () => {
    vi.stubEnv("WCA_ORIGIN", "");
    expect(wcaIlrLiveUrl("Foo2026")).toBe(
      "https://www.worldcubeassociation.org/competitions/Foo2026/live",
    );
    expect(wcaClassicLiveUrl("Foo2026")).toBe(
      "https://live.worldcubeassociation.org/link/competitions/Foo2026",
    );
    expect(cubingMexicoLiveUrl("Foo2026")).toBe("/live/Foo2026");
  });

  it("picks official links from scoretaking software", () => {
    vi.stubEnv("WCA_ORIGIN", "");
    expect(officialLiveUrl("Foo2026", "internal")).toBe(
      "https://www.worldcubeassociation.org/competitions/Foo2026/live",
    );
    expect(officialLiveUrl("Foo2026", null)).toBe(
      "https://www.worldcubeassociation.org/competitions/Foo2026/live",
    );
    expect(officialLiveUrl("Foo2026", "wca_live")).toBe(
      "https://live.worldcubeassociation.org/link/competitions/Foo2026",
    );
    expect(officialLiveUrl("Foo2026", "external")).toBe(
      "https://www.worldcubeassociation.org/competitions/Foo2026",
    );
  });

  it("routes the competitions table to local live when in progress", () => {
    expect(competitionsTableLiveHref("Foo2026", "in_progress")).toBe(
      "/live/Foo2026",
    );
    vi.stubEnv("WCA_ORIGIN", "");
    expect(competitionsTableLiveHref("Foo2026", "upcoming")).toBe(
      "https://www.worldcubeassociation.org/competitions/Foo2026/live",
    );
    expect(competitionsTableLiveHref("Foo2026", "past")).toBe(
      "https://www.worldcubeassociation.org/competitions/Foo2026/live",
    );
  });

  it("parses scoretaking software values", () => {
    expect(parseScoretakingSoftware("internal")).toBe("internal");
    expect(parseScoretakingSoftware("wca_live")).toBe("wca_live");
    expect(parseScoretakingSoftware("external")).toBe("external");
    expect(parseScoretakingSoftware("other")).toBeNull();
    expect(parseScoretakingSoftware(undefined)).toBeNull();
  });
});
