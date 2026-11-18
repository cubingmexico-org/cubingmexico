import type { TDocumentDefinitions } from "pdfmake/interfaces";
import * as pdfMake from "pdfmake/build/pdfmake";
import { fontDeclarationsFor } from "@/lib/fonts";

/** Render a pdfmake document definition to a PDF Buffer (server-side). */
export function renderPdfBuffer(
  docDefinition: TDocumentDefinitions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(
        docDefinition,
        undefined,
        fontDeclarationsFor(docDefinition),
      );
      pdf.getBuffer((buffer) => {
        resolve(Buffer.from(buffer));
      });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
