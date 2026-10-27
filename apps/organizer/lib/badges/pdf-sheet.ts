import { jsPDF } from "jspdf";
import type { ExtendedPerson } from "@/types/wcif";
import { canvasToPngDataUrl } from "./download";
import type { BadgeRenderer } from "./render-canvas";

// US Letter in landscape, with a 1 inch margin on every side.
const LETTER_WIDTH_MM = 11 * 25.4;
const LETTER_HEIGHT_MM = 8.5 * 25.4;
const MARGIN_MM = 25.4;
const USABLE_WIDTH = LETTER_WIDTH_MM - MARGIN_MM * 2;
const USABLE_HEIGHT = LETTER_HEIGHT_MM - MARGIN_MM * 2;
const COLUMNS = 4;
const ROWS = 2;

/** Badges per sheet: 4 front/back pairs, or 8 fronts. */
export function badgesPerSheet(enableBackSide: boolean): number {
  return enableBackSide ? 4 : COLUMNS * ROWS;
}

function rotateCanvasForLandscapeExport(
  canvas: HTMLCanvasElement,
): HTMLCanvasElement {
  if (canvas.width <= canvas.height) {
    return canvas;
  }

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = canvas.height;
  rotatedCanvas.height = canvas.width;

  const rotatedCtx = rotatedCanvas.getContext("2d");
  if (!rotatedCtx) {
    return canvas;
  }

  rotatedCtx.translate(rotatedCanvas.width, 0);
  rotatedCtx.rotate(Math.PI / 2);
  rotatedCtx.drawImage(canvas, 0, 0);

  return rotatedCanvas;
}

function drawDottedLine(
  pdf: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segment = 1,
  gap = 1,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const step = segment + gap;
  const segments = Math.ceil(len / step);
  for (let i = 0; i < segments; i++) {
    const start = (i * step) / len;
    const end = Math.min((i * step + segment) / len, 1);
    pdf.line(x1 + dx * start, y1 + dy * start, x1 + dx * end, y1 + dy * end);
  }
}

/** Dotted cut lines splitting the usable area into 4 columns and 2 rows. */
function drawCutLines(pdf: jsPDF): void {
  pdf.setLineWidth(0.3);
  pdf.setDrawColor(120);
  for (let c = 1; c < COLUMNS; c++) {
    const x = MARGIN_MM + (c * USABLE_WIDTH) / COLUMNS;
    drawDottedLine(pdf, x, MARGIN_MM, x, MARGIN_MM + USABLE_HEIGHT);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = MARGIN_MM + (r * USABLE_HEIGHT) / ROWS;
    drawDottedLine(pdf, MARGIN_MM, y, MARGIN_MM + USABLE_WIDTH, y);
  }
}

/**
 * Letter sheets for cutting out: each slot is a quarter of the width by half the
 * height. With back sides, a badge's back sits in the slot right of its front.
 */
export async function createBadgeSheetPdf(
  persons: ExtendedPerson[],
  {
    enableBackSide,
    createCanvasForSide,
  }: {
    enableBackSide: boolean;
    createCanvasForSide: BadgeRenderer["createCanvasForSide"];
  },
): Promise<jsPDF> {
  const perSheet = badgesPerSheet(enableBackSide);
  const columnsPerBadge = enableBackSide ? 2 : 1;
  const badgesPerRow = COLUMNS / columnsPerBadge;
  const slotWidth = USABLE_WIDTH / COLUMNS;
  const slotHeight = USABLE_HEIGHT / ROWS;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM],
  });

  const addSide = async (
    person: ExtendedPerson,
    side: "front" | "back",
    x: number,
    y: number,
  ) => {
    const canvas = rotateCanvasForLandscapeExport(
      await createCanvasForSide(person, side),
    );
    pdf.addImage(
      canvasToPngDataUrl(canvas),
      "PNG",
      x,
      y,
      slotWidth,
      slotHeight,
    );
  };

  for (let i = 0; i < persons.length; i += perSheet) {
    if (i > 0) {
      pdf.addPage([LETTER_WIDTH_MM, LETTER_HEIGHT_MM]);
    }

    await Promise.all(
      persons.slice(i, i + perSheet).map(async (person, index) => {
        const row = Math.floor(index / badgesPerRow);
        const col = (index % badgesPerRow) * columnsPerBadge;
        const x = MARGIN_MM + col * slotWidth;
        const y = MARGIN_MM + row * slotHeight;

        await addSide(person, "front", x, y);
        if (enableBackSide) {
          await addSide(person, "back", x + slotWidth, y);
        }
      }),
    );

    drawCutLines(pdf);
  }

  return pdf;
}
