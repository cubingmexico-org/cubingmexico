import { describe, expect, it } from "vitest";
import {
  COMMUNITIES_PUBLICLY_RELEASED,
  GROUP_ID_REGEX,
  SPONSORS_PUBLICLY_RELEASED,
  canShowGroupsLinks,
  groupBasePath,
  groupHref,
  groupIdFromName,
  groupKindLabel,
  groupRecordLabel,
  isGroupKindPubliclyReleased,
} from "./groups";

describe("groups helpers", () => {
  it("gates public group links until launch", () => {
    expect(canShowGroupsLinks(true)).toBe(true);
    expect(canShowGroupsLinks(false)).toBe(
      COMMUNITIES_PUBLICLY_RELEASED || SPONSORS_PUBLICLY_RELEASED,
    );
    expect(isGroupKindPubliclyReleased("community")).toBe(
      COMMUNITIES_PUBLICLY_RELEASED,
    );
    expect(isGroupKindPubliclyReleased("sponsor")).toBe(
      SPONSORS_PUBLICLY_RELEASED,
    );
  });

  it("maps kinds to public paths and labels", () => {
    expect(groupBasePath("community")).toBe("/communities");
    expect(groupBasePath("sponsor")).toBe("/sponsors");
    expect(groupHref("community", "vallarta")).toBe("/communities/vallarta");
    expect(groupHref("sponsor", "cubos-dany")).toBe("/sponsors/cubos-dany");
    expect(groupKindLabel("community")).toBe("Comunidad");
    expect(groupKindLabel("sponsor")).toBe("Patrocinador");
    expect(groupRecordLabel("community")).toBeNull();
    expect(groupRecordLabel("sponsor")).toBe("SpR");
  });

  it("validates slug ids", () => {
    expect(GROUP_ID_REGEX.test("vallarta")).toBe(true);
    expect(GROUP_ID_REGEX.test("cubos-dany")).toBe(true);
    expect(GROUP_ID_REGEX.test("Cubos")).toBe(false);
    expect(GROUP_ID_REGEX.test("-bad")).toBe(false);
  });

  it("derives slug ids from names", () => {
    expect(groupIdFromName("Vallarta Speed")).toBe("vallarta-speed");
    expect(groupIdFromName("Cubos Dany")).toBe("cubos-dany");
    expect(groupIdFromName("  México Ñandú  ")).toBe("mexico-nandu");
    expect(GROUP_ID_REGEX.test(groupIdFromName("Vallarta Speed"))).toBe(true);
  });
});
