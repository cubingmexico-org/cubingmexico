import { describe, expect, it } from "vitest";
import type { Content } from "pdfmake/interfaces";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import {
  buildAllAssignedScorecardsDocument,
  buildBlankScorecardsDocument,
} from "./build-document";

// QR codes are data URLs whose bytes depend on the qrcode library version.
expect.addSnapshotSerializer({
  test: (value) => typeof value === "string" && value.startsWith("data:image/"),
  serialize: () => '"<data url>"',
});

function pageTables(content: unknown): { table: { body: Content[][] } }[] {
  return content as { table: { body: Content[][] } }[];
}

describe("scorecard documents", () => {
  it("lays out every assigned competitor's scorecard", async () => {
    const doc = await buildAllAssignedScorecardsDocument(makePrintablesWcif(), {
      backgroundDataUrl: null,
    });

    expect(doc.info?.title).toBe("Papeletas — Printables Open 2025");
    expect(doc.images).toBeUndefined();
    expect(doc).toMatchSnapshot();
  });

  it("fills partial pages with empty cells so cut lines stay aligned", async () => {
    const doc = await buildAllAssignedScorecardsDocument(makePrintablesWcif(), {
      backgroundDataUrl: null,
    });
    const tables = pageTables(doc.content);
    const cellsPerPage = tables.map((page) => page.table.body.flat().length);

    expect(new Set(cellsPerPage).size).toBe(1);
    expect(tables.at(-1)).not.toHaveProperty("pageBreak");
    for (const page of tables.slice(0, -1)) {
      expect(page).toHaveProperty("pageBreak", "after");
    }
  });

  it("adds the background image only when one is loaded", async () => {
    const doc = await buildAllAssignedScorecardsDocument(makePrintablesWcif(), {
      backgroundDataUrl: "data:image/png;base64,AAAA",
    });

    expect(doc.images).toEqual({ scorecardBg: "data:image/png;base64,AAAA" });
  });

  it("prints one blank variant per round format", () => {
    const doc = buildBlankScorecardsDocument(makePrintablesWcif(), {
      backgroundDataUrl: null,
    });

    expect(doc.info?.title).toBe("Papeletas en blanco — Printables Open 2025");
    expect(doc).toMatchSnapshot();
  });
});
