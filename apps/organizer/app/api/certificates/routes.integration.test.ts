import { beforeEach, describe, expect, it } from "vitest";
import { GET as getParticipation } from "./participation/route";
import { POST as postPodium } from "./podium/route";
import { addCompetition, addWcif, signIn } from "@/test/fake-wca";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import type { Result, WCIF } from "@/types/wcif";

const COMPETITION = "PrintablesOpen2025";
const USER = "2015LOPE01";

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

beforeEach(() => {
  addCompetition(COMPETITION, { endDate: "2025-03-15" });
  addWcif(wcifWithResults());
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

  it("filters by age using birthdates from the request body", async () => {
    signIn(USER);
    const response = await postPodium(
      podiumRequest({
        competitionId: COMPETITION,
        template: "age",
        minAge: 0,
        maxAge: 15,
        birthdates: [
          [1, "2010-01-01"],
          [2, "1990-06-01"],
          [3, "2012-05-20"],
        ],
      }),
    );

    expect(response.status).toBe(200);
    const podium = (await response.json()) as { name: string; event: string }[];
    expect(podium.filter((p) => p.event === "333").map((p) => p.name)).toEqual([
      "Ana López",
      "Carla Núñez",
    ]);
  });
});
