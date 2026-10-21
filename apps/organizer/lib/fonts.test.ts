import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BADGE_SYSTEM_FONTS, BUNDLED_FONTS, fontDeclarations } from "./fonts";

const publicDir = join(__dirname, "..", "public");

describe("BUNDLED_FONTS", () => {
  it.each(BUNDLED_FONTS)("$family has its files in public/", (font) => {
    for (const path of [font.regular, font.bold].filter(Boolean)) {
      expect(existsSync(join(publicDir, path!)), path).toBe(true);
    }
  });

  it("has unique family names", () => {
    const families = BUNDLED_FONTS.map((f) => f.family);
    expect(new Set(families).size).toBe(families.length);
  });

  it("does not repeat badge-only system fonts", () => {
    const bundled = new Set(BUNDLED_FONTS.map((f) => f.family));
    expect(BADGE_SYSTEM_FONTS.filter((f) => bundled.has(f))).toEqual([]);
  });

  it("declares every bundled font for pdfmake", () => {
    expect(Object.keys(fontDeclarations).sort()).toEqual(
      BUNDLED_FONTS.map((f) => f.family).sort(),
    );
  });
});
