import { describe, expect, it } from "vitest";
import {
  buildCollectiveCompareHref,
  collectiveKindLabel,
  collectiveRefsEqual,
  parseCollectiveRef,
  serializeCollectiveRef,
} from "./collective-compare";

describe("collective compare refs", () => {
  it("serializes typed refs", () => {
    expect(serializeCollectiveRef({ kind: "team", id: "JAL" })).toBe(
      "team:JAL",
    );
    expect(serializeCollectiveRef({ kind: "community", id: "vallarta" })).toBe(
      "community:vallarta",
    );
    expect(serializeCollectiveRef({ kind: "sponsor", id: "cubos-dany" })).toBe(
      "sponsor:cubos-dany",
    );
  });

  it("parses typed refs and bare team ids", () => {
    expect(parseCollectiveRef("team:jal")).toEqual({
      kind: "team",
      id: "JAL",
    });
    expect(parseCollectiveRef("JAL")).toEqual({ kind: "team", id: "JAL" });
    expect(parseCollectiveRef("community:vallarta")).toEqual({
      kind: "community",
      id: "vallarta",
    });
    expect(parseCollectiveRef("sponsor:cubos-dany")).toEqual({
      kind: "sponsor",
      id: "cubos-dany",
    });
  });

  it("rejects invalid and ambiguous values", () => {
    expect(parseCollectiveRef("vallarta")).toBeNull();
    expect(parseCollectiveRef("community:BAD_ID")).toBeNull();
    expect(parseCollectiveRef("person:2010AAAA01")).toBeNull();
    expect(parseCollectiveRef("")).toBeNull();
    expect(parseCollectiveRef(undefined)).toBeNull();
  });

  it("compares and labels refs", () => {
    expect(
      collectiveRefsEqual(
        { kind: "team", id: "JAL" },
        { kind: "team", id: "JAL" },
      ),
    ).toBe(true);
    expect(
      collectiveRefsEqual(
        { kind: "team", id: "JAL" },
        { kind: "community", id: "jal" },
      ),
    ).toBe(false);
    expect(collectiveKindLabel("community")).toBe("Comunidad");
  });

  it("builds compare hrefs", () => {
    expect(
      buildCollectiveCompareHref(
        { kind: "team", id: "JAL" },
        { kind: "community", id: "vallarta" },
      ),
    ).toBe("/teams/compare?a=team%3AJAL&b=community%3Avallarta");
    expect(buildCollectiveCompareHref({ kind: "team", id: "JAL" }, null)).toBe(
      "/teams/compare?a=team%3AJAL",
    );
    expect(buildCollectiveCompareHref(null, null, true)).toBe(
      "/teams/compare?deprecated=true",
    );
  });
});
