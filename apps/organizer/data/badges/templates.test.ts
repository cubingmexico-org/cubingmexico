import { describe, expect, it } from "vitest";
import { clampElementToCanvas } from "@/lib/canvas-bounds";
import { BADGE_DESIGN_TEMPLATES } from "./templates";

describe.each(BADGE_DESIGN_TEMPLATES)("$name", ({ document }) => {
  const elements = [...document.elements.front, ...document.elements.back];

  it("has unique element ids", () => {
    const ids = elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every element inside the canvas", () => {
    for (const element of elements) {
      const { x, y, width, height } = element;
      expect(
        clampElementToCanvas(
          element,
          document.canvasWidth,
          document.canvasHeight,
        ),
        element.id,
      ).toEqual({ x, y, width, height });
    }
  });

  it("has no back elements unless the back side is enabled", () => {
    if (!document.enableBackSide) {
      expect(document.elements.back).toEqual([]);
    }
  });
});

describe("BADGE_DESIGN_TEMPLATES", () => {
  it("uses unique template ids", () => {
    const ids = BADGE_DESIGN_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
