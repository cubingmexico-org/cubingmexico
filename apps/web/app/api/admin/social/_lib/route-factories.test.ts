import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: null as string | null }));
const social = vi.hoisted(() => ({
  fetchSocialCaption: vi.fn(),
  fetchSocialImage: vi.fn(),
  fetchWeeklyDigestSlides: vi.fn(),
  fetchWeeklyDigestSlideImage: vi.fn(),
  markSocialPosted: vi.fn(),
  publishSocialPost: vi.fn(),
}));

vi.mock("server-only", () => ({}));
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
vi.mock("@/app/(root)/admin/_lib/social", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/(root)/admin/_lib/social")>()),
  ...social,
}));

import {
  captionRoute,
  imageRoute,
  markRoute,
  publishRoute,
  SOCIAL_ROUTES,
  slideImageRoute,
  slidesRoute,
} from "./route-factories";

function context(key: string, postType = "nemesis") {
  return { params: Promise.resolve({ postType, key }) };
}

function slideContext(postType: string, key: string, index: string) {
  return { params: Promise.resolve({ postType, key, index }) };
}

const request = (body?: unknown) =>
  new Request("http://localhost/api/admin/social/nemesis/x", {
    method: body === undefined ? "GET" : "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const png = {
  ok: true,
  bytes: new ArrayBuffer(1),
  filename: "semana-2026-W43-0.png",
  slideId: "intro",
};

beforeEach(() => {
  session.userId = "2015ADMN01";
  for (const fn of Object.values(social)) fn.mockReset();
});

describe("social route registry", () => {
  it("keeps the URL segments the admin panel calls", () => {
    expect([...SOCIAL_ROUTES.keys()].sort()).toEqual([
      "mollerz",
      "nemesis",
      "records",
      "resultados",
      "streaks-monthly",
      "summary-unlock",
      "upcoming",
      "weekly-digest",
      "year-recap",
    ]);
  });
});

describe("social route factories", () => {
  it("returns 401 without a session and 403 for non-superadmins", async () => {
    session.userId = null;
    expect((await captionRoute(request(), context("k"))).status).toBe(401);

    session.userId = "2016USER01";
    expect((await captionRoute(request(), context("k"))).status).toBe(403);
    expect(social.fetchSocialCaption).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown post type", async () => {
    const response = await captionRoute(request(), context("k", "stories"));
    expect(response.status).toBe(404);
    expect(social.fetchSocialCaption).not.toHaveBeenCalled();
  });

  it("returns 400 for a blank key, named after the post type's param", async () => {
    const response = await captionRoute(request(), context("  "));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      message: "subjectKey required",
    });

    const resultados = await captionRoute(
      request(),
      context(" ", "resultados"),
    );
    expect(await resultados.json()).toEqual({
      success: false,
      message: "competitionId required",
    });
  });

  it("decodes the key and passes it to the backend helper", async () => {
    social.fetchSocialCaption.mockResolvedValue({
      ok: true,
      caption: "fb",
      facebookCaption: "fb",
      instagramCaption: "ig",
    });

    const response = await captionRoute(request(), context("2019ABCD01%3A333"));

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

  it("maps the URL segment to the post type", async () => {
    social.fetchSocialCaption.mockResolvedValue({ ok: true, caption: "" });

    await captionRoute(request(), context("k", "records"));
    await captionRoute(request(), context("2026-10", "streaks-monthly"));

    expect(social.fetchSocialCaption.mock.calls).toEqual([
      ["record", "k"],
      ["streaks_monthly", "2026-10"],
    ]);
  });

  it("keeps upstream error statuses and maps the rest to 502", async () => {
    social.fetchSocialImage.mockResolvedValue({
      ok: false,
      status: 404,
      body: { error: "missing" },
    });
    expect((await imageRoute(request(), context("k"))).status).toBe(404);

    social.publishSocialPost.mockResolvedValue({
      ok: false,
      status: 302,
      body: null,
    });
    expect((await publishRoute(request({}), context("k"))).status).toBe(502);

    vi.spyOn(console, "error").mockImplementation(() => {});
    social.publishSocialPost.mockRejectedValue(new Error("boom"));
    const thrown = await publishRoute(request({}), context("k"));
    expect(thrown.status).toBe(502);
    expect(await thrown.json()).toEqual({ success: false, message: "boom" });
  });

  it("has no single-image route for the year recap", async () => {
    const response = await imageRoute(request(), context("2025", "year-recap"));
    expect(response.status).toBe(404);
    expect(social.fetchSocialImage).not.toHaveBeenCalled();
  });

  it("forwards the platforms from the mark body", async () => {
    social.markSocialPosted.mockResolvedValue({
      ok: true,
      status: 200,
      body: {},
    });

    const response = await markRoute(
      request({ platforms: ["facebook"] }),
      context("k"),
    );

    expect(response.status).toBe(200);
    expect(social.markSocialPosted).toHaveBeenCalledWith("nemesis", "k", [
      "facebook",
    ]);
  });

  it("marks every platform when the mark body is empty", async () => {
    social.markSocialPosted.mockResolvedValue({
      ok: true,
      status: 200,
      body: {},
    });

    const response = await markRoute(
      new Request("http://localhost/api/admin/social/nemesis/x", {
        method: "POST",
      }),
      context("k"),
    );

    expect(response.status).toBe(200);
    expect(social.markSocialPosted).toHaveBeenCalledWith(
      "nemesis",
      "k",
      undefined,
    );
  });

  it("rejects a malformed mark body", async () => {
    for (const body of [{ platforms: "facebook" }, { platforms: [1] }]) {
      const response = await markRoute(request(body), context("k"));
      expect(response.status).toBe(400);
    }
    expect(social.markSocialPosted).not.toHaveBeenCalled();
  });
});

describe("carousel slide routes", () => {
  it("lists slides for carousel post types only", async () => {
    social.fetchWeeklyDigestSlides.mockResolvedValue({
      ok: true,
      count: 1,
      slides: [{ index: 0, id: "intro", title: "Intro" }],
    });

    const response = await slidesRoute(
      request(),
      context("2026-W43", "weekly-digest"),
    );
    expect(social.fetchWeeklyDigestSlides).toHaveBeenCalledWith(
      "2026-W43",
      "weekly_digest",
    );
    expect(await response.json()).toEqual({
      success: true,
      count: 1,
      slides: [{ index: 0, id: "intro", title: "Intro" }],
      week: "2026-W43",
      postType: "weekly_digest",
      subjectKey: "2026-W43",
    });

    expect((await slidesRoute(request(), context("k"))).status).toBe(404);
  });

  it("serves a slide image with its id", async () => {
    social.fetchWeeklyDigestSlideImage.mockResolvedValue(png);

    const response = await slideImageRoute(
      request(),
      slideContext("year-recap", "2025", "3"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Slide-Id")).toBe("intro");
    expect(social.fetchWeeklyDigestSlideImage).toHaveBeenCalledWith(
      "2025",
      3,
      "year_recap",
    );
  });

  it("rejects a non-numeric slide index", async () => {
    const response = await slideImageRoute(
      request(),
      slideContext("weekly-digest", "2026-W43", "first"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      message: "index: invalid slide index",
    });
    expect(social.fetchWeeklyDigestSlideImage).not.toHaveBeenCalled();
  });
});
