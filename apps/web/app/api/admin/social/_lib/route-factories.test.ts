import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: null as string | null }));
const social = vi.hoisted(() => ({
  fetchSocialCaption: vi.fn(),
  fetchSocialImage: vi.fn(),
  markSocialPosted: vi.fn(),
  publishSocialPost: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/team-auth", () => ({
  getSessionUserId: async () => session.userId,
}));
vi.mock("@/lib/superadmin", () => ({
  isSuperadmin: (userId: string) => userId === "2015ADMN01",
}));
vi.mock("@/app/(root)/admin/_lib/social", () => social);

import {
  captionRoute,
  imageRoute,
  markRoute,
  publishRoute,
} from "./route-factories";

const options = {
  postType: "nemesis",
  param: "subjectKey",
  label: "NÉMESIS",
} as const;

function context(subjectKey: string) {
  return { params: Promise.resolve({ subjectKey }) };
}

const request = (body?: unknown) =>
  new Request("http://localhost/api/admin/social/nemesis/x", {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  session.userId = "2015ADMN01";
  for (const fn of Object.values(social)) fn.mockReset();
});

describe("social route factories", () => {
  it("returns 401 without a session and 403 for non-superadmins", async () => {
    const GET = captionRoute(options);

    session.userId = null;
    expect((await GET(request(), context("k"))).status).toBe(401);

    session.userId = "2016USER01";
    expect((await GET(request(), context("k"))).status).toBe(403);
    expect(social.fetchSocialCaption).not.toHaveBeenCalled();
  });

  it("returns 400 for a blank key", async () => {
    const response = await captionRoute(options)(request(), context("  "));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      message: "subjectKey required",
    });
  });

  it("decodes the key and passes it to the backend helper", async () => {
    social.fetchSocialCaption.mockResolvedValue({
      ok: true,
      caption: "fb",
      facebookCaption: "fb",
      instagramCaption: "ig",
    });

    const response = await captionRoute(options)(
      request(),
      context("2019ABCD01%3A333"),
    );

    expect(social.fetchSocialCaption).toHaveBeenCalledWith(
      "nemesis",
      "2019ABCD01:333",
    );
    expect(await response.json()).toEqual({
      success: true,
      caption: "fb",
      facebookCaption: "fb",
      instagramCaption: "ig",
      subjectKey: "2019ABCD01:333",
      postType: "nemesis",
    });
  });

  it("keeps upstream error statuses and maps the rest to 502", async () => {
    social.fetchSocialImage.mockResolvedValue({
      ok: false,
      status: 404,
      body: { error: "missing" },
    });
    expect((await imageRoute(options)(request(), context("k"))).status).toBe(
      404,
    );

    social.publishSocialPost.mockResolvedValue({
      ok: false,
      status: 302,
      body: null,
    });
    expect(
      (await publishRoute(options)(request({}), context("k"))).status,
    ).toBe(502);

    vi.spyOn(console, "error").mockImplementation(() => {});
    social.publishSocialPost.mockRejectedValue(new Error("boom"));
    const thrown = await publishRoute(options)(request({}), context("k"));
    expect(thrown.status).toBe(502);
    expect(await thrown.json()).toEqual({ success: false, message: "boom" });
  });

  it("forwards the platforms from the mark body", async () => {
    social.markSocialPosted.mockResolvedValue({
      ok: true,
      status: 200,
      body: {},
    });

    const response = await markRoute(options)(
      request({ platforms: ["facebook"] }),
      context("k"),
    );

    expect(response.status).toBe(200);
    expect(social.markSocialPosted).toHaveBeenCalledWith("nemesis", "k", [
      "facebook",
    ]);
  });
});
