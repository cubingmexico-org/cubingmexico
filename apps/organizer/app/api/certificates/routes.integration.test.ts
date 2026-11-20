import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getParticipation } from "./participation/route";
import { POST as postPodium } from "./podium/route";
import { POST as postParticipationEmail } from "./participation/email/route";
import { addCompetition, addWcif, signIn } from "@/test/fake-wca";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import type { Result, WCIF } from "@/types/wcif";

const COMPETITION = "PrintablesOpen2025";
const USER = "2015LOPE01";

vi.mock("@/lib/certificates/render-pdf-buffer", () => ({
  renderPdfBuffer: async () => Buffer.from("%PDF-fake"),
}));

vi.mock("@/lib/email/resend", () => ({
  sendCertificateEmail: vi.fn(async ({ to }: { to: string }) => {
    if (to.includes("quota-daily")) {
      return {
        ok: false as const,
        error: "daily_quota_exceeded",
        dailyQuotaHit: true,
      };
    }
    if (to.includes("quota-monthly")) {
      return {
        ok: false as const,
        error: "monthly_quota_exceeded",
        monthlyQuotaHit: true,
      };
    }
    if (to.includes("fail")) {
      return { ok: false as const, error: "smtp boom" };
    }
    return { ok: true as const, id: `email-${to}` };
  }),
}));

function result(
  personId: number,
  ranking: number,
  best: number,
  average: number,
): Result {
  return { personId, ranking, attempts: [], best, average };
}

function wcifWithResults(): WCIF {
  const wcif = makePrintablesWcif();
  const [cube, blind] = wcif.events;
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

function podiumRequest(body: unknown) {
  return new Request("http://localhost/api/certificates/podium", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function emailRequest(body: unknown) {
  return new Request("http://localhost/api/certificates/participation/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  addCompetition(COMPETITION, {
    endDate: "2025-03-15",
    organizers: [USER],
  });
  addWcif(wcifWithResults());
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_FROM_EMAIL", "certificados@example.com");
});

describe("GET /api/certificates/participation", () => {
  it("requires a session", async () => {
    const response = await getParticipation(
      new Request(
        `http://localhost/api/certificates/participation?competitionId=${COMPETITION}`,
      ),
    );
    expect(response.status).toBe(401);
  });

  it("rejects a missing or malformed competitionId", async () => {
    signIn(USER);
    for (const query of ["", "?competitionId=../x"]) {
      const response = await getParticipation(
        new Request(`http://localhost/api/certificates/participation${query}`),
      );
      expect(response.status).toBe(400);
    }
  });

  it("lists every competitor with results", async () => {
    signIn(USER);
    const response = await getParticipation(
      new Request(
        `http://localhost/api/certificates/participation?competitionId=${COMPETITION}`,
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { name: string }[];
    expect(body.map((p) => p.name)).toHaveLength(4);
  });
});

describe("POST /api/certificates/podium", () => {
  it("requires a session", async () => {
    const response = await postPodium(
      podiumRequest({ competitionId: COMPETITION, template: "general" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects an invalid body", async () => {
    signIn(USER);
    const response = await postPodium(
      podiumRequest({ competitionId: COMPETITION, template: "unknown" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns the podium of every completed event", async () => {
    signIn(USER);
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
    signIn(USER);
    const wcif = wcifWithResults();
    wcif.persons[0]!.birthdate = "2010-01-01"; // Ana ~15
    wcif.persons[1]!.birthdate = "1990-06-01"; // Beto adult
    wcif.persons[2]!.birthdate = "2012-05-20"; // Carla ~12
    addWcif(wcif);

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
    addCompetition(COMPETITION, { endDate: "2025-03-15", organizers: [] });
    signIn(USER);
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

describe("POST /api/certificates/participation/email", () => {
  const design = {
    content: { type: "doc", content: [] },
    pageMargins: [40, 40, 40, 40],
    pageOrientation: "landscape" as const,
    pageSize: "LETTER",
  };

  it("requires a session", async () => {
    const response = await postParticipationEmail(
      emailRequest({
        competitionId: COMPETITION,
        registrantIds: [1],
        ...design,
      }),
    );
    expect(response.status).toBe(401);
  });

  it("forbids non-managers", async () => {
    addCompetition(COMPETITION, { endDate: "2025-03-15", organizers: [] });
    signIn(USER);
    const response = await postParticipationEmail(
      emailRequest({
        competitionId: COMPETITION,
        registrantIds: [1],
        ...design,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("sends attachments and reports missing emails", async () => {
    signIn(USER);
    const wcif = wcifWithResults();
    wcif.persons[0]!.email = "ana@example.com";
    // person 2 (Beto) has no email → skipped
    addWcif(wcif);

    const { sendCertificateEmail } = await import("@/lib/email/resend");
    const response = await postParticipationEmail(
      emailRequest({
        competitionId: COMPETITION,
        registrantIds: [1, 2],
        ...design,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      sent: 1,
      failed: [],
      skippedNoEmail: [2],
      dailyQuotaHit: false,
      monthlyQuotaHit: false,
    });
    expect(sendCertificateEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@example.com",
        filename: expect.stringContaining("Ana López"),
      }),
    );
  });

  it("stops when the daily Resend quota is hit", async () => {
    signIn(USER);
    const wcif = wcifWithResults();
    wcif.persons[0]!.email = "quota-daily@example.com";
    addWcif(wcif);

    const response = await postParticipationEmail(
      emailRequest({
        competitionId: COMPETITION,
        registrantIds: [1],
        ...design,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      sent: 0,
      dailyQuotaHit: true,
      failed: [{ registrantId: 1, error: "daily_quota_exceeded" }],
    });
  });
});
