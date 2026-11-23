import { describe, expect, it } from "vitest";
import { brandMarkSrc } from "./brand-image";

describe("brandMarkSrc", () => {
  it("prefers icon over image", () => {
    expect(brandMarkSrc("icon.png", "logo.png")).toBe("icon.png");
  });

  it("falls back to image when icon is missing", () => {
    expect(brandMarkSrc(null, "logo.png")).toBe("logo.png");
    expect(brandMarkSrc(undefined, "logo.png")).toBe("logo.png");
    expect(brandMarkSrc("", "logo.png")).toBe("logo.png");
  });

  it("returns null when both are missing", () => {
    expect(brandMarkSrc(null, null)).toBeNull();
    expect(brandMarkSrc(undefined, undefined)).toBeNull();
  });
});
