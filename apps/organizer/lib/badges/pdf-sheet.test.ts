import { describe, expect, it, vi } from "vitest";
import type { ExtendedPerson } from "@/types/wcif";

const pdfs = vi.hoisted(() => [] as FakePdf[]);

type FakePdf = {
  images: { label: string; x: number; y: number; w: number; h: number }[];
  pages: number;
  lines: number;
};

vi.mock("jspdf", () => ({
  jsPDF: class {
    record: FakePdf = { images: [], pages: 1, lines: 0 };
    constructor() {
      pdfs.push(this.record);
    }
    addImage(
      label: string,
      _f: string,
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      this.record.images.push({ label, x, y, w, h });
    }
    addPage() {
      this.record.pages += 1;
    }
    line() {
      this.record.lines += 1;
    }
    setLineWidth() {}
    setDrawColor() {}
  },
}));

const { badgesPerSheet, createBadgeSheetPdf } = await import("./pdf-sheet");

const person = (name: string) => ({ name }) as ExtendedPerson;

// Portrait canvases skip the landscape rotation, which needs a DOM.
const createCanvasForSide = async (p: ExtendedPerson, side: string) =>
  ({
    width: 600,
    height: 900,
    toDataURL: () => `${p.name}:${side}`,
  }) as unknown as HTMLCanvasElement;

const MARGIN = 25.4;
const SLOT_W = (11 * 25.4 - 2 * MARGIN) / 4;
const SLOT_H = (8.5 * 25.4 - 2 * MARGIN) / 2;

describe("createBadgeSheetPdf", () => {
  it("puts 8 fronts per sheet in a 4x2 grid", async () => {
    pdfs.length = 0;
    const persons = Array.from({ length: 9 }, (_, i) => person(`P${i}`));

    await createBadgeSheetPdf(persons, {
      enableBackSide: false,
      createCanvasForSide,
    });

    const [pdf] = pdfs;
    expect(badgesPerSheet(false)).toBe(8);
    expect(pdf!.pages).toBe(2);
    const p5 = pdf!.images.find((i) => i.label === "P5:front")!;
    expect(p5.x).toBeCloseTo(MARGIN + SLOT_W);
    expect(p5.y).toBeCloseTo(MARGIN + SLOT_H);
    expect(p5.w).toBeCloseTo(SLOT_W);
    expect(p5.h).toBeCloseTo(SLOT_H);
    const p8 = pdf!.images.find((i) => i.label === "P8:front")!;
    expect(p8.x).toBeCloseTo(MARGIN);
    expect(p8.y).toBeCloseTo(MARGIN);
  });

  it("places each back right of its front, 4 pairs per sheet", async () => {
    pdfs.length = 0;
    const persons = Array.from({ length: 4 }, (_, i) => person(`P${i}`));

    await createBadgeSheetPdf(persons, {
      enableBackSide: true,
      createCanvasForSide,
    });

    const [pdf] = pdfs;
    const expectAt = (label: string, x: number, y: number) => {
      const image = pdf!.images.find((i) => i.label === label);
      expect(image?.x).toBeCloseTo(x);
      expect(image?.y).toBeCloseTo(y);
    };
    expect(badgesPerSheet(true)).toBe(4);
    expect(pdf!.pages).toBe(1);
    expectAt("P1:front", MARGIN + 2 * SLOT_W, MARGIN);
    expectAt("P1:back", MARGIN + 3 * SLOT_W, MARGIN);
    expectAt("P2:front", MARGIN, MARGIN + SLOT_H);
    expectAt("P2:back", MARGIN + SLOT_W, MARGIN + SLOT_H);
    expect(pdf!.lines).toBeGreaterThan(0);
  });
});
