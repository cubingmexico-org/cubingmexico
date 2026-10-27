import { describe, expect, it } from "vitest";
import {
  colorToString,
  colorsEqual,
  hexToRgb,
  hslToRgb,
  hsvEqual,
  hsvToRgb,
  parseColorString,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@workspace/ui/lib/color";

const RED = { r: 255, g: 0, b: 0, a: 1 };
const TEAL = { r: 0, g: 128, b: 128, a: 1 };

describe("hexToRgb", () => {
  it("parses six-digit hex with or without #", () => {
    expect(hexToRgb("#ff0000")).toEqual(RED);
    expect(hexToRgb("008080")).toEqual(TEAL);
    expect(hexToRgb("#FF0000", 0.5)).toEqual({ ...RED, a: 0.5 });
  });

  it("expands three-digit shorthand", () => {
    expect(hexToRgb("#f00")).toEqual(RED);
    expect(hexToRgb("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it("falls back to black for invalid input", () => {
    expect(hexToRgb("nope")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(hexToRgb("#12345")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe("rgbToHex", () => {
  it("pads and rounds channels", () => {
    expect(rgbToHex({ r: 1, g: 15.6, b: 255, a: 1 })).toBe("#0110ff");
  });
});

describe("hsv conversions", () => {
  it("converts primary colors", () => {
    expect(rgbToHsv(RED)).toEqual({ h: 0, s: 100, v: 100, a: 1 });
    expect(rgbToHsv({ r: 0, g: 0, b: 255, a: 1 })).toEqual({
      h: 240,
      s: 100,
      v: 100,
      a: 1,
    });
    expect(rgbToHsv({ r: 0, g: 0, b: 0, a: 0.3 })).toEqual({
      h: 0,
      s: 0,
      v: 0,
      a: 0.3,
    });
  });

  it("wraps negative hues", () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 128, a: 1 }).h).toBe(330);
  });

  it("round-trips through every hue sector", () => {
    for (const color of [
      RED,
      TEAL,
      { r: 255, g: 255, b: 0, a: 1 },
      { r: 0, g: 255, b: 0, a: 1 },
      { r: 0, g: 0, b: 255, a: 1 },
      { r: 255, g: 0, b: 255, a: 1 },
      { r: 128, g: 128, b: 128, a: 1 },
    ]) {
      expect(hsvToRgb(rgbToHsv(color))).toEqual(color);
    }
  });
});

describe("hsl conversions", () => {
  it("converts to and from hsl", () => {
    expect(rgbToHsl(RED)).toEqual({ h: 0, s: 100, l: 50 });
    expect(rgbToHsl(TEAL)).toEqual({ h: 180, s: 100, l: 25 });
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual(RED);
    expect(hslToRgb({ h: 180, s: 100, l: 25 }, 0.4)).toEqual({
      r: 0,
      g: 128,
      b: 128,
      a: 0.4,
    });
  });

  it("round-trips through every hue sector", () => {
    for (const h of [0, 60, 120, 180, 240, 300]) {
      const rgb = hslToRgb({ h, s: 100, l: 50 });
      expect(rgbToHsl(rgb)).toEqual({ h, s: 100, l: 50 });
    }
  });
});

describe("colorToString", () => {
  it("formats opaque colors", () => {
    expect(colorToString(TEAL)).toBe("#008080");
    expect(colorToString(TEAL, "rgb")).toBe("rgb(0, 128, 128)");
    expect(colorToString(TEAL, "hsl")).toBe("hsl(180, 100%, 25%)");
    expect(colorToString(TEAL, "hsb")).toBe("hsb(180, 100%, 50%)");
  });

  it("includes alpha below 1", () => {
    const translucent = { ...TEAL, a: 0.5 };
    expect(colorToString(translucent, "hex")).toBe("#008080");
    expect(colorToString(translucent, "rgb")).toBe("rgba(0, 128, 128, 0.5)");
    expect(colorToString(translucent, "hsl")).toBe("hsla(180, 100%, 25%, 0.5)");
    expect(colorToString(translucent, "hsb")).toBe("hsba(180, 100%, 50%, 0.5)");
  });
});

describe("parseColorString", () => {
  it("parses every supported format", () => {
    expect(parseColorString(" #008080 ")).toEqual(TEAL);
    expect(parseColorString("#f00")).toEqual(RED);
    expect(parseColorString("rgb(0, 128, 128)")).toEqual(TEAL);
    expect(parseColorString("rgba(0,128,128,0.25)")).toEqual({
      ...TEAL,
      a: 0.25,
    });
    expect(parseColorString("hsl(180, 100%, 25%)")).toEqual(TEAL);
    expect(parseColorString("hsla(0, 100%, 50%, 0.5)")).toEqual({
      ...RED,
      a: 0.5,
    });
    expect(parseColorString("hsb(180, 100%, 50%)")).toEqual(TEAL);
  });

  it("round-trips colorToString output", () => {
    for (const format of ["hex", "rgb", "hsl", "hsb"] as const) {
      expect(parseColorString(colorToString(TEAL, format))).toEqual(TEAL);
    }
  });

  it("returns null for anything else", () => {
    for (const value of [
      "",
      "red",
      "#12",
      "#1234",
      "rgb(1, 2)",
      "hsl(1,2,3)",
    ]) {
      expect(parseColorString(value)).toBeNull();
    }
  });
});

describe("equality helpers", () => {
  it("compares every channel", () => {
    expect(colorsEqual(TEAL, { ...TEAL })).toBe(true);
    expect(colorsEqual(TEAL, { ...TEAL, a: 0.9 })).toBe(false);
    expect(hsvEqual(rgbToHsv(TEAL), rgbToHsv(TEAL))).toBe(true);
    expect(hsvEqual(rgbToHsv(TEAL), rgbToHsv(RED))).toBe(false);
  });
});
