import * as pdfMake from "pdfmake/build/pdfmake";
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { fontDeclarations } from "@/lib/fonts";

export type PrintAction = "open" | "download";

export function createGroupsPdf(
  docDefinition: TDocumentDefinitions,
  action: PrintAction,
  filename: string,
): void {
  const pdf = pdfMake.createPdf(docDefinition, undefined, fontDeclarations);
  if (action === "open") {
    pdf.open();
  } else {
    pdf.download(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  }
}
