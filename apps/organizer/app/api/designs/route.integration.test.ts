import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "./route";
import { addCompetition, signIn } from "@/test/fake-wca";
import {
  COMPETITION,
  ORGANIZER,
  OTHER_COMPETITION,
  STRANGER,
  findDesign,
  insertDesign,
  jsonRequest,
} from "@/test/design-fixtures";

beforeEach(() => {
  addCompetition(COMPETITION, { organizers: [ORGANIZER] });
  addCompetition(OTHER_COMPETITION, { delegates: [STRANGER] });
});

function listRequest(query: string) {
  return new Request(`http://localhost/api/designs?${query}`);
}

describe("GET /api/designs", () => {
  it("requires a session", async () => {
    const response = await GET(
      listRequest(`competitionId=${COMPETITION}&module=badges`),
    );
    expect(response.status).toBe(401);
  });

  it("lists the competition's designs for the selected module", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "badge", competitionId: COMPETITION });
    await insertDesign({
      id: "podium",
      competitionId: COMPETITION,
      module: "certificate_podium",
    });
    await insertDesign({ id: "other", competitionId: OTHER_COMPETITION });

    const response = await GET(
      listRequest(`competitionId=${COMPETITION}&module=badges`),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.designs.map((d: { id: string }) => d.id)).toEqual(["badge"]);
    expect(body.designs[0].json).toBeUndefined();
  });

  it("forbids competitions the user doesn't manage", async () => {
    signIn(STRANGER);
    const response = await GET(
      listRequest(`competitionId=${COMPETITION}&module=badges`),
    );
    expect(response.status).toBe(403);
  });

  it("rejects an unknown module", async () => {
    signIn(ORGANIZER);
    const response = await GET(
      listRequest(`competitionId=${COMPETITION}&module=posters`),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/designs", () => {
  const body = { name: "Gafete", module: "badges", json: { elements: [] } };

  it("requires a session", async () => {
    const response = await POST(jsonRequest("/api/designs", "POST", body));
    expect(response.status).toBe(401);
  });

  it("creates a private competition design for a manager", async () => {
    signIn(ORGANIZER);
    const response = await POST(
      jsonRequest("/api/designs", "POST", {
        ...body,
        competitionId: COMPETITION,
        isPublic: true,
      }),
    );

    expect(response.status).toBe(201);
    const { design } = await response.json();
    const row = await findDesign(design.id);
    expect(row).toMatchObject({
      competitionId: COMPETITION,
      userId: ORGANIZER,
      isPublic: false,
      ownerScope: "user",
    });
  });

  it("forbids creating designs for competitions the user doesn't manage", async () => {
    signIn(STRANGER);
    const response = await POST(
      jsonRequest("/api/designs", "POST", {
        ...body,
        competitionId: COMPETITION,
      }),
    );
    expect(response.status).toBe(403);
  });

  it("only creates library templates when they are public", async () => {
    signIn(ORGANIZER);
    const privateResponse = await POST(
      jsonRequest("/api/designs", "POST", body),
    );
    expect(privateResponse.status).toBe(400);

    const publicResponse = await POST(
      jsonRequest("/api/designs", "POST", { ...body, isPublic: true }),
    );
    expect(publicResponse.status).toBe(201);
    const { design } = await publicResponse.json();
    expect(await findDesign(design.id)).toMatchObject({
      competitionId: null,
      isPublic: true,
    });
  });

  it("rejects org and global designs", async () => {
    signIn(ORGANIZER);
    const response = await POST(
      jsonRequest("/api/designs", "POST", {
        ...body,
        isPublic: true,
        ownerScope: "global",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("validates the body", async () => {
    signIn(ORGANIZER);
    const response = await POST(
      jsonRequest("/api/designs", "POST", { ...body, name: "" }),
    );
    expect(response.status).toBe(400);
  });
});
