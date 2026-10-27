import { jsPDF } from "jspdf";
import type { ExtendedPerson } from "@/types/wcif";
import { canvasToPngDataUrl } from "./download";
import type { BadgeRenderer } from "./render-canvas";

/** One badge per page: the front, then the back when enabled. */
export async function createBadgePdf(
  person: ExtendedPerson,
  {
    pageWidthMm,
    pageHeightMm,
    enableBackSide,
    createCanvasForSide,
  }: {
    pageWidthMm: number;
    pageHeightMm: number;
    enableBackSide: boolean;
    createCanvasForSide: BadgeRenderer["createCanvasForSide"];
  },
): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: pageWidthMm > pageHeightMm ? "landscape" : "portrait",
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
  });

  const front = await createCanvasForSide(person, "front");
  pdf.addImage(
    canvasToPngDataUrl(front),
    "PNG",
    0,
    0,
    pageWidthMm,
    pageHeightMm,
  );

  if (enableBackSide) {
    pdf.addPage([pageWidthMm, pageHeightMm]);
    const back = await createCanvasForSide(person, "back");
    pdf.addImage(
      canvasToPngDataUrl(back),
      "PNG",
      0,
      0,
      pageWidthMm,
      pageHeightMm,
    );
  }

  return pdf;
}
