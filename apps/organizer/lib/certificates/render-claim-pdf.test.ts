import { describe, expect, it, vi } from "vitest";
import type { Competition } from "@/types/wca";
import type { Result } from "@/types/wcif";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import { renderClaimPdf } from "./render-claim-pdf";

vi.mock("@/lib/certificates/render-pdf-buffer", () => ({
  renderPdfBuffer: async () => Buffer.from("%PDF-fake"),
}));

function withResults() {
  const wcif = makePrintablesWcif();
  const [cube, blind] = wcif.events;
  const result = (
    personId: number,
    ranking: number,
    best: number,
    average: number,
  ): Result => ({ personId, ranking, attempts: [], best, average });
  cube!.rounds[0]!.results = [
    result(1, 2, 950, 1000),
    result(2, 1, 850, 900),
    result(3, 3, 1000, 1100),
    result(4, 4, 1100, 1200),
  ];
  blind!.rounds[0]!.results = [
    result(1, 2, 3000, -1),
    result(3, 1, 2500, 2800),
  ];
  return wcif;
}

const competition = {
  id: "PrintablesOpen2025",
  name: "Printables Open 2025",
  start_date: "2025-03-15",
  end_date: "2025-03-15",
} as Competition;

const shareJson = {
  content: { type: "doc" as const, content: [] },
  pageMargins: [40, 40, 40, 40] as [number, number, number, number],
  pageOrientation: "landscape" as const,
  pageSize: "LETTER" as const,
};

describe("renderClaimPdf", () => {
  it("renders a PDF for a wcaId match", async () => {
    const result = await renderClaimPdf({
      competition,
      wcif: withResults(),
      subject: "2015LOPE01",
      shareJson,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.personName).toBe("Ana López");
      expect(result.filename).toContain("Ana Lopez");
      expect(result.pdf.toString()).toContain("%PDF");
    }
  });

  it("renders a PDF for a newcomer wcaUserId match", async () => {
    const wcif = withResults();
    const diego = wcif.persons.find((p) => p.name.startsWith("Diego"))!;
    const result = await renderClaimPdf({
      competition,
      wcif,
      subject: String(diego.wcaUserId),
      shareJson,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.personName).toBe("Diego Ramírez");
    }
  });

  it("rejects someone not in the competition", async () => {
    const result = await renderClaimPdf({
      competition,
      wcif: withResults(),
      subject: "2010OTHER01",
      shareJson,
    });
    expect(result).toEqual({ ok: false, reason: "not_in_competition" });
  });
});
