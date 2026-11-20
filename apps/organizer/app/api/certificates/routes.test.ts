import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition } from "@/types/wca";
import type { Result, WCIF } from "@/types/wcif";
import { makePrintablesWcif } from "@/test/wcif-fixture";

const COMPETITION = "PrintablesOpen2025";
const USER = "2015LOPE01";

let signedInWcaId: string | null = null;
let competition: Competition | undefined;
let wcif: WCIF | undefined;

const shareRows: Array<{
  id: string;
  token: string;
  competitionId: string;
  userId: string;
  module: string;
  json: unknown;
}> = [];

const designRows: Array<{
  id: string;
  competitionId: string | null;
  module: string;
  json: unknown;
  updatedAt: Date;
}> = [];

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () =>
        signedInWcaId
          ? { user: { id: signedInWcaId, wcaId: signedInWcaId } }
          : null,
      getAccessToken: async () =>
        signedInWcaId ? { accessToken: "fake-wca-token" } : null,
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

vi.mock("@/lib/wca-wcif", () => ({
  requireWcaAccessToken: async () => {
    if (!signedInWcaId) {
      throw new Error("No se pudo obtener el token de WCA");
    }
    return "fake-wca-token";
  },
  getAuthorizedWcif: async (competitionId: string) => {
    if (!wcif || wcif.id !== competitionId) {
      throw new Error("No se pudo cargar el WCIF autorizado (404)");
    }
    return wcif;
  },
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");

  const rowsFor = (table: unknown) => {
    if (table === schema.design) {
      return designRows.filter(
        (row) =>
          row.competitionId === COMPETITION &&
          row.module === "certificate_participation",
      );
    }
    return shareRows.filter(
      (row) =>
        row.competitionId === COMPETITION &&
        row.module === "certificate_participation",
    );
  };

  const selectChain = (table: unknown) => {
    const finish = async (limit?: number) => {
      const rows = rowsFor(table);
      return limit === undefined ? rows : rows.slice(0, limit);
    };
    return {
      where: () => ({
        orderBy: () => ({
          limit: (n: number) => finish(n),
        }),
        limit: (n: number) => finish(n),
      }),
      limit: (n: number) => finish(n),
    };
  };

  return {
    db: {
      select: () => ({
        from: (table: unknown) => selectChain(table),
      }),
      insert: () => ({
        values: async (values: (typeof shareRows)[number]) => {
          shareRows.push(values);
        },
      }),
      update: () => ({
        set: (patch: Partial<(typeof shareRows)[number]>) => ({
          where: async () => {
            const row = shareRows[0];
            if (row) Object.assign(row, patch);
          },
        }),
      }),
    },
  };
});

import { GET as getParticipation } from "./participation/route";
import { POST as postPodium } from "./podium/route";
import { POST as postParticipationShare } from "./participation/share/route";

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

function makeCompetition(organizers: string[]): Competition {
  return {
    id: COMPETITION,
    name: COMPETITION,
    city: "Ciudad de México",
    organizers: organizers.map((wca_id, index) => ({
      id: index + 1,
      wca_id,
      name: wca_id,
    })),
    delegates: [],
    start_date: "2025-03-15",
    end_date: "2025-03-15",
    event_ids: ["333", "333bf"],
  } as unknown as Competition;
}

function podiumRequest(body: unknown) {
  return new Request("http://localhost/api/certificates/podium", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function shareRequest(body: unknown) {
  return new Request("http://localhost/api/certificates/participation/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const cloudDesignJson = {
  content: { type: "doc", content: [{ type: "paragraph" }] },
  pageConfig: {
    pageSize: "LETTER",
    pageOrientation: "landscape" as const,
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
  },
};

beforeEach(() => {
  signedInWcaId = null;
  competition = makeCompetition([USER]);
  wcif = wcifWithResults();
  shareRows.length = 0;
  designRows.length = 0;
  designRows.push({
    id: "design-1",
    competitionId: COMPETITION,
    module: "certificate_participation",
    json: cloudDesignJson,
    updatedAt: new Date(),
  });
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3001");
});

describe("GET /api/certificates/participation", () => {
  it("lists every competitor with results", async () => {
    signedInWcaId = USER;
    const response = await getParticipation(
      new Request(
        `http://localhost/api/certificates/participation?competitionId=${COMPETITION}`,
      ),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { name: string }[];
    expect(body).toHaveLength(4);
  });
});

describe("POST /api/certificates/podium", () => {
  it("returns the podium of every completed event", async () => {
    signedInWcaId = USER;
    const response = await postPodium(
      podiumRequest({ competitionId: COMPETITION, template: "general" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { name: "Beto Martínez (贝托)", place: 1, event: "333", result: 900 },
      { name: "Ana López", place: 2, event: "333", result: 1000 },
      { name: "Carla Núñez", place: 3, event: "333", result: 1100 },
      { name: "Carla Núñez", place: 1, event: "333bf", result: 2500 },
      { name: "Ana López", place: 2, event: "333bf", result: 3000 },
    ]);
  });

  it("filters by age using birthdates from the authorized WCIF", async () => {
    signedInWcaId = USER;
    wcif!.persons[0]!.birthdate = "2010-01-01";
    wcif!.persons[1]!.birthdate = "1990-06-01";
    wcif!.persons[2]!.birthdate = "2012-05-20";

    const response = await postPodium(
      podiumRequest({
        competitionId: COMPETITION,
        template: "age",
        minAge: 0,
        maxAge: 15,
      }),
    );

    expect(response.status).toBe(200);
    const podium = (await response.json()) as { name: string; event: string }[];
    expect(podium.filter((p) => p.event === "333").map((p) => p.name)).toEqual([
      "Ana López",
      "Carla Núñez",
    ]);
  });

  it("forbids age podiums when the user does not manage the competition", async () => {
    competition = makeCompetition([]);
    signedInWcaId = USER;
    const response = await postPodium(
      podiumRequest({
        competitionId: COMPETITION,
        template: "age",
        minAge: 0,
        maxAge: 15,
      }),
    );
    expect(response.status).toBe(403);
  });
});

describe("POST /api/certificates/participation/share", () => {
  it("publishes a stable claim link and lists emails", async () => {
    signedInWcaId = USER;
    wcif!.persons[0]!.email = "ana@example.com";

    const first = await postParticipationShare(
      shareRequest({
        competitionId: COMPETITION,
        registrantIds: [1, 2],
      }),
    );
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody).toMatchObject({
      competitionName: COMPETITION,
      emails: ["ana@example.com"],
      skippedNoEmail: [2],
      claimUrl: expect.stringMatching(/^http:\/\/localhost:3001\/claim\//),
    });
    expect(shareRows[0]?.json).toMatchObject({
      content: cloudDesignJson.content,
      pageMargins: cloudDesignJson.pageConfig.pageMargins,
    });

    const second = await postParticipationShare(
      shareRequest({
        competitionId: COMPETITION,
        registrantIds: [1],
        background: "data:image/png;base64,abc",
      }),
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.token).toBe(firstBody.token);
    expect(shareRows).toHaveLength(1);
    expect(shareRows[0]?.json).toMatchObject({
      background: "data:image/png;base64,abc",
    });
  });

  it("publishes a link without emails when no registrants are selected", async () => {
    signedInWcaId = USER;
    const response = await postParticipationShare(
      shareRequest({ competitionId: COMPETITION }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.emails).toEqual([]);
    expect(body.claimUrl).toMatch(/^http:\/\/localhost:3001\/claim\//);
  });

  it("requires a cloud-saved participation design", async () => {
    signedInWcaId = USER;
    designRows.length = 0;
    const response = await postParticipationShare(
      shareRequest({ competitionId: COMPETITION }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("nube"),
    });
  });

  it("forbids non-managers", async () => {
    competition = makeCompetition([]);
    signedInWcaId = USER;
    const response = await postParticipationShare(
      shareRequest({
        competitionId: COMPETITION,
        registrantIds: [1],
      }),
    );
    expect(response.status).toBe(403);
  });
});
