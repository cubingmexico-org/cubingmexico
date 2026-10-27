import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const searchSite = vi.hoisted(() => vi.fn());

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/db/site-search", () => ({ searchSite }));

import { GET } from "./route";

const EMPTY = { persons: [], competitions: [], teams: [] };

const search = (q: string) =>
  GET(
    new NextRequest(
      `http://localhost/api/search?${new URLSearchParams({ q }).toString()}`,
    ),
  );

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  searchSite.mockReset();
  vi.restoreAllMocks();
});

describe("GET /api/search", () => {
  it("rejects queries shorter than 2 characters", async () => {
    const response = await search(" a ");

    expect(response.status).toBe(400);
    expect(searchSite).not.toHaveBeenCalled();
  });

  it("rejects queries longer than 64 characters", async () => {
    const response = await search("a".repeat(65));

    expect(response.status).toBe(400);
    expect(searchSite).not.toHaveBeenCalled();
  });

  it("returns trimmed-query results with a short shared cache", async () => {
    searchSite.mockResolvedValue(EMPTY);

    const response = await search(` ${"a".repeat(64)} `);

    expect(response.status).toBe(200);
    expect(searchSite).toHaveBeenCalledWith("a".repeat(64));
    expect(await response.json()).toEqual({ success: true, data: EMPTY });
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });

  it("returns a 500 without caching when the search fails", async () => {
    searchSite.mockRejectedValue(new Error("db down"));

    const response = await search("ana");

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
});
