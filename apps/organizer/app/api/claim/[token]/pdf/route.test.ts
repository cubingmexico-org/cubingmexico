import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition } from "@/types/wca";
import type { Result, WCIF } from "@/types/wcif";
import { makePrintablesWcif } from "@/test/wcif-fixture";

const TOKEN = "share-token-abc";
const COMPETITION = "PrintablesOpen2025";

let signedInWcaId: string | null = null;
let competition: Competition | undefined;
let wcif: WCIF | undefined;
let share:
  | {
      token: string;
      competitionId: string;
      json: unknown;
    }
  | undefined;

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () =>
        signedInWcaId
          ? { user: { id: signedInWcaId, wcaId: signedInWcaId } }
          : null,
    },
  },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

vi.mock("@/db/queries", () => ({
  getCompetitionById: async ({ id }: { id: string }) =>
    competition?.id === id ? competition : undefined,
  getWCIFByCompetitionId: async ({
    competitionId,
  }: {
    competitionId: string;
  }) => (wcif?.id === competitionId ? wcif : undefined),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (share ? [share] : []),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/certificates/render-pdf-buffer", () => ({
  renderPdfBuffer: async () => Buffer.from("%PDF-fake"),
}));

import { GET as getClaimPdf } from "./route";

function result(
  personId: number,
  ranking: number,
  best: number,
  average: number,
): Result {
  return { personId, ranking, attempts: [], best, average };
}

function wcifWithResults(): WCIF {
  const next = makePrintablesWcif();
  const [cube, blind] = next.events;
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
  return next;
}

beforeEach(() => {
  signedInWcaId = null;
  competition = {
    id: COMPETITION,
    name: "Printables Open 2025",
    start_date: "2025-03-15",
    end_date: "2025-03-15",
  } as Competition;
  wcif = wcifWithResults();
  share = {
    token: TOKEN,
    competitionId: COMPETITION,
    json: {
      content: { type: "doc", content: [] },
      pageMargins: [40, 40, 40, 40],
      pageOrientation: "landscape",
      pageSize: "LETTER",
    },
  };
});

describe("GET /api/claim/[token]/pdf", () => {
  it("requires a session", async () => {
    const response = await getClaimPdf(new Request("http://localhost"), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 for an unknown token", async () => {
    signedInWcaId = "2015LOPE01";
    share = undefined;
    const response = await getClaimPdf(new Request("http://localhost"), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(response.status).toBe(404);
  });

  it("returns a PDF for the signed-in competitor", async () => {
    signedInWcaId = "2015LOPE01";
    const response = await getClaimPdf(new Request("http://localhost"), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("Ana Lopez");
    expect(Buffer.from(await response.arrayBuffer()).toString()).toContain(
      "%PDF",
    );
  });

  it("forbids someone who did not compete", async () => {
    signedInWcaId = "2010OTHER01";
    const response = await getClaimPdf(new Request("http://localhost"), {
      params: Promise.resolve({ token: TOKEN }),
    });
    expect(response.status).toBe(403);
  });
});
