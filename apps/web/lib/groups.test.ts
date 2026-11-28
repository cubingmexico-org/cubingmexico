import { describe, expect, it } from "vitest";
import {
  GROUP_ID_REGEX,
  formatGroupLocationLine,
  groupBasePath,
  groupHref,
  groupIdFromName,
  groupKindLabel,
} from "./groups";

describe("groups helpers", () => {
  it("maps kinds to public paths and labels", () => {
    expect(groupBasePath("community")).toBe("/communities");
    expect(groupBasePath("sponsor")).toBe("/sponsors");
    expect(groupHref("community", "vallarta")).toBe("/communities/vallarta");
    expect(groupHref("sponsor", "cubos-dany")).toBe("/sponsors/cubos-dany");
    expect(groupKindLabel("community")).toBe("Comunidad");
    expect(groupKindLabel("sponsor")).toBe("Patrocinador");
  });

  it("formats location lines", () => {
    expect(
      formatGroupLocationLine({
        kind: "community",
        regionLabel: "Zona metropolitana de Puerto Vallarta",
      }),
    ).toBe("Zona metropolitana de Puerto Vallarta");
    expect(
      formatGroupLocationLine({
        kind: "sponsor",
        city: "Ciudad de México",
        stateName: "Ciudad de México",
      }),
    ).toBe("Ciudad de México, Ciudad de México");
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
