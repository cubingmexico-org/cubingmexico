import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, PUT } from "./route";
import { POST as CLONE } from "./clone/route";
import { addCompetition, signIn } from "@/test/fake-wca";
import {
  COMPETITION,
  ORGANIZER,
  OTHER_COMPETITION,
  STRANGER,
  findDesign,
  insertDesign,
  jsonRequest,
  routeContext,
} from "@/test/design-fixtures";

beforeEach(() => {
  addCompetition(COMPETITION, { organizers: [ORGANIZER] });
  addCompetition(OTHER_COMPETITION, { delegates: [STRANGER] });
});

function get(id: string) {
  return GET(jsonRequest(`/api/designs/${id}`, "GET"), routeContext(id));
}

function put(id: string, body: unknown) {
  return PUT(jsonRequest(`/api/designs/${id}`, "PUT", body), routeContext(id));
}

function remove(id: string) {
  return DELETE(jsonRequest(`/api/designs/${id}`, "DELETE"), routeContext(id));
}

function clone(id: string, body: unknown) {
  return CLONE(
    jsonRequest(`/api/designs/${id}/clone`, "POST", body),
    routeContext(id),
  );
}

describe("GET /api/designs/:id", () => {
  it("requires a session", async () => {
    await insertDesign({ id: "mine" });
    expect((await get("mine")).status).toBe(401);
  });

  it("returns 404 for a missing design", async () => {
    signIn(ORGANIZER);
    expect((await get("missing")).status).toBe(404);
  });

  it("returns the owner's private template with its json", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "mine", json: { elements: [{ id: "a" }] } });

    const response = await get("mine");

    expect(response.status).toBe(200);
    expect((await response.json()).design.json).toEqual({
      elements: [{ id: "a" }],
    });
  });

  it("hides other users' private templates but shows public ones", async () => {
    signIn(STRANGER);
    await insertDesign({ id: "private" });
    await insertDesign({ id: "public", isPublic: true });

    expect((await get("private")).status).toBe(403);
    expect((await get("public")).status).toBe(200);
  });

  it("only shows competition designs to the competition's managers", async () => {
    await insertDesign({
      id: "comp",
      competitionId: COMPETITION,
      userId: STRANGER,
    });

    signIn(STRANGER);
    expect((await get("comp")).status).toBe(403);
    signIn(ORGANIZER);
    expect((await get("comp")).status).toBe(200);
  });
});

describe("PUT /api/designs/:id", () => {
  it("lets the owner rename a template and toggle isPublic", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "mine" });

    const response = await put("mine", { name: "Nuevo", isPublic: true });

    expect(response.status).toBe(200);
    expect(await findDesign("mine")).toMatchObject({
      name: "Nuevo",
      isPublic: true,
    });
  });

  it("keeps competition designs private", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "comp", competitionId: COMPETITION });

    expect((await put("comp", { isPublic: true })).status).toBe(200);
    expect((await findDesign("comp"))?.isPublic).toBe(false);
  });

  it("forbids editing someone else's template, even a public one", async () => {
    signIn(STRANGER);
    await insertDesign({ id: "public", isPublic: true });

    expect((await put("public", { name: "Mío" })).status).toBe(403);
    expect((await findDesign("public"))?.name).toBe("public");
  });

  it("rejects an update with no fields", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "mine" });
    expect((await put("mine", {})).status).toBe(400);
  });
});

describe("DELETE /api/designs/:id", () => {
  it("lets the owner delete a template", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "mine" });

    expect((await remove("mine")).status).toBe(200);
    expect(await findDesign("mine")).toBeUndefined();
  });

  it("never deletes global templates", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "global", ownerScope: "global", isPublic: true });

    expect((await remove("global")).status).toBe(403);
    expect(await findDesign("global")).toBeDefined();
  });

  it("forbids deleting another competition's designs", async () => {
    signIn(ORGANIZER);
    await insertDesign({
      id: "theirs",
      competitionId: OTHER_COMPETITION,
      userId: STRANGER,
    });

    expect((await remove("theirs")).status).toBe(403);
  });
});

describe("POST /api/designs/:id/clone", () => {
  it("copies a public template into a managed competition", async () => {
    signIn(ORGANIZER);
    await insertDesign({
      id: "template",
      userId: STRANGER,
      isPublic: true,
      json: { elements: [{ id: "a" }] },
    });

    const response = await clone("template", { competitionId: COMPETITION });

    expect(response.status).toBe(201);
    const { design } = await response.json();
    expect(await findDesign(design.id)).toMatchObject({
      name: "template (copia)",
      competitionId: COMPETITION,
      userId: ORGANIZER,
      isPublic: false,
      json: { elements: [{ id: "a" }] },
    });
  });

  it("forbids cloning into a competition the user doesn't manage", async () => {
    signIn(ORGANIZER);
    await insertDesign({ id: "template", isPublic: true });

    const response = await clone("template", {
      competitionId: OTHER_COMPETITION,
    });
    expect(response.status).toBe(403);
  });

  it("forbids cloning someone else's private template", async () => {
    signIn(STRANGER);
    await insertDesign({ id: "private" });

    const response = await clone("private", {
      competitionId: OTHER_COMPETITION,
    });
    expect(response.status).toBe(403);
  });
});
