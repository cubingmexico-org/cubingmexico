import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BADGE_SYSTEM_FONTS,
  BUNDLED_FONTS,
  fontDeclarationsFor,
} from "./fonts";

const publicDir = join(__dirname, "..", "public");

/** Families saved designs may reference. Add new names here; never remove one. */
const PUBLISHED_FAMILIES = [
  "Allura",
  "Anton",
  "Archivo",
  "Barlow",
  "Basically A Sans Serif Font",
  "Bebas Neue",
  "Black Ops One",
  "Bungee",
  "Caveat",
  "Chau Philomene",
  "Cinzel",
  "Cookie",
  "Cormorant Garamond",
  "Crimson Text",
  "DM Sans",
  "Dancing Script",
  "EB Garamond",
  "Fira Sans",
  "Great Vibes",
  "Inter",
  "Josefin Sans",
  "Kanit",
  "Kaushan Script",
  "Lato",
  "Libre Baskerville",
  "Lobster",
  "Lora",
  "Manrope",
  "Maven Pro",
  "Merriweather",
  "Montserrat",
  "Mulish",
  "Noto Sans",
  "Nunito",
  "Open Sans",
  "Oswald",
  "PT Sans",
  "Pacifico",
  "Parisienne",
  "Playfair Display",
  "Poppins",
  "Raleway",
  "Righteous",
  "Roboto",
  "Roboto Condensed",
  "Roboto Mono",
  "Roboto Slab",
  "Rubik",
  "Russo One",
  "Sacramento",
  "Santa Monday",
  "Satisfy",
  "Source Sans 3",
  "Ubuntu",
  "Work Sans",
];

describe("BUNDLED_FONTS", () => {
  it.each(BUNDLED_FONTS)("$family has its files in public/", (font) => {
    const paths = [font.regular, font.bold, font.webRegular, font.webBold];
    for (const path of paths.filter((p): p is string => Boolean(p))) {
      expect(existsSync(join(publicDir, path)), path).toBe(true);
    }
  });

  it("keeps every published family name", () => {
    expect(BUNDLED_FONTS.map((f) => f.family)).toEqual(
      expect.arrayContaining(PUBLISHED_FAMILIES),
    );
  });

  it("has unique family names", () => {
    const families = BUNDLED_FONTS.map((f) => f.family);
    expect(new Set(families).size).toBe(families.length);
  });

  it("does not repeat badge-only system fonts", () => {
    const bundled = new Set(BUNDLED_FONTS.map((f) => f.family));
    expect(BADGE_SYSTEM_FONTS.filter((f) => bundled.has(f))).toEqual([]);
  });
});

describe("fontDeclarationsFor", () => {
  it("declares only Roboto and the bundled fonts the document uses", () => {
    const declarations = fontDeclarationsFor({
      defaultStyle: { font: "Lato" },
      styles: { title: { font: "Cinzel" } },
      content: [
        { text: "a", font: "Montserrat" },
        { stack: [{ text: [{ text: "b", font: "Bebas Neue" }] }] },
        { text: "c", font: "Not A Bundled Font" },
      ],
    });
    expect(Object.keys(declarations).sort()).toEqual([
      "Bebas Neue",
      "Cinzel",
      "Lato",
      "Montserrat",
      "Roboto",
    ]);
  });

  it("falls back to the regular file for single-weight fonts", () => {
    const { Anton } = fontDeclarationsFor({ content: [{ font: "Anton" }] });
    expect(Anton?.bold).toBe(Anton?.normal);
    expect(Anton?.normal).toMatch(/\/fonts\/Anton\/Anton-Regular\.ttf$/);
  });

  it("returns a fresh object on every call", () => {
    expect(fontDeclarationsFor({})).not.toBe(fontDeclarationsFor({}));
    expect(fontDeclarationsFor({}).Roboto).not.toBe(
      fontDeclarationsFor({}).Roboto,
    );
  });
});
