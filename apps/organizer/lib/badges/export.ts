import { toast } from "sonner";
import type { ExtendedPerson } from "@/types/wcif";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import type { Competition } from "@/types/wca";
import type { BadgeRenderer } from "./render-canvas";

export function createBadgeExporters({
  selectedPersons,
  competition,
  setIsExporting,
  blankPerson,
  canvasWidth,
  canvasHeight,
  enableBackSide,
  pxToMm,
  createCanvasForSide,
}: {
  selectedPersons: ExtendedPerson[];
  competition: Competition;
  setIsExporting: (value: boolean) => void;
  blankPerson: ExtendedPerson;
  canvasWidth: number;
  canvasHeight: number;
  enableBackSide: boolean;
  pxToMm: BadgeRenderer["pxToMm"];
  createCanvasForSide: BadgeRenderer["createCanvasForSide"];
}) {
  const exportToPNG = async () => {
    setIsExporting(true);

    const personsToExport =
      selectedPersons.length > 0 ? selectedPersons : [blankPerson];

    // Wrap the entire export logic in toast.promise
    toast.promise(
      (async () => {
        // Single badge export
        if (personsToExport.length === 1) {
          const person = personsToExport[0]!;

          // Export front side
          const frontCanvas = await createCanvasForSide(person, "front");
          frontCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${person.name.replace(/\s/g, "_")}_badge_front.png`;
              a.click();
              URL.revokeObjectURL(url);
            }
          });

          // Export back side if enabled
          if (enableBackSide) {
            const backCanvas = await createCanvasForSide(person, "back");
            backCanvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${person.name.replace(/\s/g, "_")}_badge_back.png`;
                a.click();
                URL.revokeObjectURL(url);
              }
            });
          }
          return;
        }

        // Multiple badges export
        const zip = new JSZip();

        const promises = personsToExport.flatMap((person) => {
          const frontPromise = (async () => {
            const canvas = await createCanvasForSide(person, "front");
            return new Promise<void>((resolve) => {
              canvas.toBlob((blob) => {
                if (blob) {
                  const filename = `${person.name.replace(/\s/g, "_")}_badge_front.png`;
                  zip.file(filename, blob);
                }
                resolve();
              });
            });
          })();

          if (enableBackSide) {
            const backPromise = (async () => {
              const canvas = await createCanvasForSide(person, "back");
              return new Promise<void>((resolve) => {
                canvas.toBlob((blob) => {
                  if (blob) {
                    const filename = `${person.name.replace(/\s/g, "_")}_badge_back.png`;
                    zip.file(filename, blob);
                  }
                  resolve();
                });
              });
            })();
            return [frontPromise, backPromise];
          }

          return [frontPromise];
        });

        // Wait for all badges to be processed
        await Promise.all(promises);

        // Generate and download the ZIP file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition.name.replace(/\s/g, "_")}_badges.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando ${personsToExport.length === 1 ? "gafete" : `${personsToExport.length} gafetes`}...`,
        success: `${personsToExport.length === 1 ? "Gafete generado" : `${personsToExport.length} gafetes generados`} exitosamente`,
        error: "Error al generar los gafetes",
      },
    );
  };

  const exportToJPG = async () => {
    setIsExporting(true);

    const personsToExport =
      selectedPersons.length > 0 ? selectedPersons : [blankPerson];

    toast.promise(
      (async () => {
        // Single badge export
        if (personsToExport.length === 1) {
          const person = personsToExport[0]!;

          // Export front side
          const frontCanvas = await createCanvasForSide(person, "front");
          const frontDataUrl = frontCanvas.toDataURL("image/jpeg", 0.95);
          const frontLink = document.createElement("a");
          frontLink.href = frontDataUrl;
          frontLink.download = `${person.name.replace(/\s/g, "_")}_badge_front.jpg`;
          frontLink.click();

          // Export back side if enabled
          if (enableBackSide) {
            const backCanvas = await createCanvasForSide(person, "back");
            const backDataUrl = backCanvas.toDataURL("image/jpeg", 0.95);
            const backLink = document.createElement("a");
            backLink.href = backDataUrl;
            backLink.download = `${person.name.replace(/\s/g, "_")}_badge_back.jpg`;
            backLink.click();
          }
          return;
        }

        // Multiple badges export
        const zip = new JSZip();

        const promises = personsToExport.flatMap((person) => {
          const frontPromise = (async () => {
            const canvas = await createCanvasForSide(person, "front");
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
            const base64Data = dataUrl.split(",")[1];
            if (base64Data) {
              const filename = `${person.name.replace(/\s/g, "_")}_badge_front.jpg`;
              zip.file(filename, base64Data, { base64: true });
            }
          })();

          if (enableBackSide) {
            const backPromise = (async () => {
              const canvas = await createCanvasForSide(person, "back");
              const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
              const base64Data = dataUrl.split(",")[1];
              if (base64Data) {
                const filename = `${person.name.replace(/\s/g, "_")}_badge_back.jpg`;
                zip.file(filename, base64Data, { base64: true });
              }
            })();
            return [frontPromise, backPromise];
          }

          return [frontPromise];
        });

        // Wait for all badges to be processed
        await Promise.all(promises);

        // Generate and download the ZIP file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition.name.replace(/\s/g, "_")}_badges_jpg.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando ${personsToExport.length === 1 ? "gafete" : `${personsToExport.length} gafetes`} JPG...`,
        success: `${personsToExport.length === 1 ? "Gafete JPG generado" : `${personsToExport.length} gafetes JPG generados`} exitosamente`,
        error: "Error al generar los JPG",
      },
    );
  };

  const exportToPDF = async () => {
    setIsExporting(true);

    const personsToExport =
      selectedPersons.length > 0 ? selectedPersons : [blankPerson];

    toast.promise(
      (async () => {
        // Calculate page dimensions in mm
        const pageWidthMm = pxToMm(canvasWidth);
        const pageHeightMm = pxToMm(canvasHeight);

        // Single person PDF export
        if (personsToExport.length === 1) {
          const person = personsToExport[0]!;

          // Create PDF with custom page size
          const pdf = new jsPDF({
            orientation: pageWidthMm > pageHeightMm ? "landscape" : "portrait",
            unit: "mm",
            format: [pageWidthMm, pageHeightMm],
          });

          // Generate front side canvas
          const frontCanvas = await createCanvasForSide(person, "front");
          const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

          // Add front page
          pdf.addImage(frontDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);

          // Add back page if enabled
          if (enableBackSide) {
            pdf.addPage([pageWidthMm, pageHeightMm]);
            const backCanvas = await createCanvasForSide(person, "back");
            const backDataUrl = backCanvas.toDataURL("image/png", 1.0);
            pdf.addImage(backDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);
          }

          // Download PDF
          pdf.save(`${person.name.replace(/\s/g, "_")}_badge.pdf`);
          return;
        }

        // Multiple persons - create ZIP with individual PDFs
        const zip = new JSZip();

        const promises = personsToExport.map(async (person) => {
          // Create PDF with custom page size
          const pdf = new jsPDF({
            orientation: pageWidthMm > pageHeightMm ? "landscape" : "portrait",
            unit: "mm",
            format: [pageWidthMm, pageHeightMm],
          });

          // Generate front side canvas
          const frontCanvas = await createCanvasForSide(person, "front");
          const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

          // Add front page
          pdf.addImage(frontDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);

          // Add back page if enabled
          if (enableBackSide) {
            pdf.addPage([pageWidthMm, pageHeightMm]);
            const backCanvas = await createCanvasForSide(person, "back");
            const backDataUrl = backCanvas.toDataURL("image/png", 1.0);
            pdf.addImage(backDataUrl, "PNG", 0, 0, pageWidthMm, pageHeightMm);
          }

          // Get PDF as blob and add to ZIP
          const pdfBlob = pdf.output("blob");
          const filename = `${person.name.replace(/\s/g, "_")}_badge.pdf`;
          zip.file(filename, pdfBlob);
        });

        // Wait for all PDFs to be generated
        await Promise.all(promises);

        // Generate and download the ZIP file
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${competition.name.replace(/\s/g, "_")}_badges_pdf.zip`;
        a.click();
        URL.revokeObjectURL(url);
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando PDF${personsToExport.length === 1 ? "" : "s"}...`,
        success: `PDF${personsToExport.length === 1 ? "" : "s"} generado${personsToExport.length === 1 ? "" : "s"} exitosamente`,
        error: "Error al generar los PDFs",
      },
    );
  };

  const exportToPDF2x2 = async () => {
    setIsExporting(true);

    const blankCount = enableBackSide ? 4 : 8;
    const personsToExport =
      selectedPersons.length > 0
        ? [...selectedPersons]
        : Array(blankCount).fill(blankPerson);

    if (selectedPersons.length > 0) {
      const remainder = personsToExport.length % blankCount;
      if (remainder !== 0) {
        const paddingNeeded = blankCount - remainder;
        for (let i = 0; i < paddingNeeded; i++) {
          personsToExport.push(blankPerson);
        }
      }
    }

    toast.promise(
      (async () => {
        const rotateCanvasForLandscapeExport = (
          canvas: HTMLCanvasElement,
        ): HTMLCanvasElement => {
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
        };

        // US Letter dimensions in mm (landscape)
        const LETTER_WIDTH_MM = 11 * 25.4; // 279.4
        const LETTER_HEIGHT_MM = 8.5 * 25.4; // 215.9

        // Leave 1 inch margin on all sides
        const MARGIN_MM = 25.4;
        const usableWidth = LETTER_WIDTH_MM - MARGIN_MM * 2;
        const usableHeight = LETTER_HEIGHT_MM - MARGIN_MM * 2;

        const drawDotted = (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pdf: any,
          x1: number,
          y1: number,
          x2: number,
          y2: number,
          segment = 1,
          gap = 1,
        ) => {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          if (len === 0) return;
          const step = segment + gap;
          const segments = Math.ceil(len / step);
          for (let i = 0; i < segments; i++) {
            const start = (i * step) / len;
            const end = Math.min((i * step + segment) / len, 1);
            const sx = x1 + dx * start;
            const sy = y1 + dy * start;
            const ex = x1 + dx * end;
            const ey = y1 + dy * end;
            pdf.line(sx, sy, ex, ey);
          }
        };

        // If back sides should be placed next to fronts -> 4 pairs per page (2x2 pairs).
        // Otherwise place 8 fronts per page (4x2 grid).
        if (enableBackSide) {
          const pairsPerPage = 4; // 2 columns x 2 rows of pairs
          const pairSlotWidth = usableWidth / 2; // each pair occupies half usable width
          const pairSlotHeight = usableHeight / 2; // each pair occupies half usable height
          const singleSlotWidth = pairSlotWidth / 2; // front/back each take half of pair width
          const singleSlotHeight = pairSlotHeight;

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM],
          });

          let firstPage = true;

          for (let i = 0; i < personsToExport.length; i += pairsPerPage) {
            const chunk = personsToExport.slice(i, i + pairsPerPage);

            if (!firstPage) {
              pdf.addPage([LETTER_WIDTH_MM, LETTER_HEIGHT_MM]);
            }
            firstPage = false;

            // For each pair in the chunk place front on left half of pair and back on right half
            await Promise.all(
              chunk.map(async (person, index) => {
                const row = Math.floor(index / 2);
                const col = index % 2;
                const baseX = MARGIN_MM + col * pairSlotWidth;
                const baseY = MARGIN_MM + row * pairSlotHeight;

                const frontCanvas = rotateCanvasForLandscapeExport(
                  await createCanvasForSide(person, "front"),
                );
                const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

                // Place front
                pdf.addImage(
                  frontDataUrl,
                  "PNG",
                  baseX,
                  baseY,
                  singleSlotWidth,
                  singleSlotHeight,
                );

                // Place back (generate even if blank)
                const backCanvas = rotateCanvasForLandscapeExport(
                  await createCanvasForSide(person, "back"),
                );
                const backDataUrl = backCanvas.toDataURL("image/png", 1.0);

                pdf.addImage(
                  backDataUrl,
                  "PNG",
                  baseX + singleSlotWidth,
                  baseY,
                  singleSlotWidth,
                  singleSlotHeight,
                );
              }),
            );

            // draw dotted cut lines over the usable area (4 columns x 2 rows)
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(120);
            // vertical lines (3 lines dividing into 4 columns)
            for (let c = 1; c < 4; c++) {
              const x = MARGIN_MM + (c * usableWidth) / 4;
              drawDotted(pdf, x, MARGIN_MM, x, MARGIN_MM + usableHeight, 1, 1);
            }
            // horizontal lines (1 line dividing into 2 rows)
            const y = MARGIN_MM + usableHeight / 2;
            drawDotted(pdf, MARGIN_MM, y, MARGIN_MM + usableWidth, y, 1, 1);
          }

          pdf.save(`${competition.name.replace(/\s/g, "_")}_badges_2x2.pdf`);
        } else {
          // No back sides: place 8 badges per page (4 columns x 2 rows) inside margins
          const cols = 4;
          const rows = 2;
          const slotsPerPage = cols * rows;
          const slotWidth = usableWidth / cols;
          const slotHeight = usableHeight / rows;

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM],
          });

          let firstPage = true;

          for (let i = 0; i < personsToExport.length; i += slotsPerPage) {
            const chunk = personsToExport.slice(i, i + slotsPerPage);

            if (!firstPage) {
              pdf.addPage([LETTER_WIDTH_MM, LETTER_HEIGHT_MM]);
            }
            firstPage = false;

            await Promise.all(
              chunk.map(async (person, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;
                const x = MARGIN_MM + col * slotWidth;
                const y = MARGIN_MM + row * slotHeight;

                const frontCanvas = rotateCanvasForLandscapeExport(
                  await createCanvasForSide(person, "front"),
                );
                const frontDataUrl = frontCanvas.toDataURL("image/png", 1.0);

                pdf.addImage(frontDataUrl, "PNG", x, y, slotWidth, slotHeight);
              }),
            );

            // draw dotted cut lines over the usable area (4 columns x 2 rows)
            pdf.setLineWidth(0.3);
            pdf.setDrawColor(120);
            // vertical lines
            for (let c = 1; c < cols; c++) {
              const x = MARGIN_MM + c * slotWidth;
              drawDotted(pdf, x, MARGIN_MM, x, MARGIN_MM + usableHeight, 1, 1);
            }
            // horizontal lines
            for (let r = 1; r < rows; r++) {
              const y = MARGIN_MM + r * slotHeight;
              drawDotted(pdf, MARGIN_MM, y, MARGIN_MM + usableWidth, y, 1, 1);
            }
          }

          pdf.save(`${competition.name.replace(/\s/g, "_")}_badges_2x2.pdf`);
        }
      })().finally(() => {
        setIsExporting(false);
      }),
      {
        loading: `Generando PDF 2x2...`,
        success: `PDF 2x2 generado exitosamente`,
        error: "Error al generar el PDF 2x2",
      },
    );
  };

  return { exportToPNG, exportToJPG, exportToPDF, exportToPDF2x2 };
}
