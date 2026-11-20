import { createRequire } from "node:module";
import { join } from "node:path";
import type {
  TDocumentDefinitions,
  TFontDictionary,
} from "pdfmake/interfaces";
import { fontFilePathsFor } from "@/lib/fonts";

const require = createRequire(import.meta.url);
const PdfPrinter = require("pdfmake") as new (
  fontDescriptors: TFontDictionary,
) => {
  createPdfKitDocument: (
    docDefinition: TDocumentDefinitions,
  ) => NodeJS.ReadableStream & {
    end: () => void;
    on: (event: string, cb: (...args: unknown[]) => void) => void;
  };
};

/** Absolute paths under `public/` for pdfmake's Node printer (no browser XHR). */
export function resolvePublicFontPaths(
  relativePaths: TFontDictionary,
): TFontDictionary {
  const publicRoot = join(process.cwd(), "public");
  return Object.fromEntries(
    Object.entries(relativePaths).map(([family, faces]) => [
      family,
      {
        normal: join(publicRoot, String(faces.normal).replace(/^\//, "")),
        bold: join(publicRoot, String(faces.bold).replace(/^\//, "")),
        italics: join(publicRoot, String(faces.italics).replace(/^\//, "")),
        bolditalics: join(
          publicRoot,
          String(faces.bolditalics).replace(/^\//, ""),
        ),
      },
    ]),
  );
}

/** Render a pdfmake document definition to a PDF Buffer (server-side). */
export async function renderPdfBuffer(
  docDefinition: TDocumentDefinitions,
): Promise<Buffer> {
  const printer = new PdfPrinter(
    resolvePublicFontPaths(fontFilePathsFor(docDefinition)),
  );
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    });
    pdfDoc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    pdfDoc.on("error", (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });
    pdfDoc.end();
  });
}
