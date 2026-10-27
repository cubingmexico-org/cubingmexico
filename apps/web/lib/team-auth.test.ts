import { afterEach, describe, expect, it, vi } from "vitest";

const limit = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({ leftJoin: () => ({ where: () => ({ limit }) }) }),
    }),
  },
}));

import { getTeamRole, hasTeamPermission } from "./team-auth";

afterEach(() => {
  limit.mockReset();
});

describe("getTeamRole", () => {
  it("returns the member's role", async () => {
    limit.mockResolvedValue([{ role: "editor" }]);
    await expect(getTeamRole("JAL", "2015ABCD01")).resolves.toBe("editor");
  });

  it("returns null for non-members", async () => {
    limit.mockResolvedValue([{ role: null }]);
    await expect(getTeamRole("JAL", "2015ABCD01")).resolves.toBeNull();
  });

  it("rethrows database errors instead of treating them as no role", async () => {
    limit.mockRejectedValue(new Error("db down"));
    await expect(getTeamRole("JAL", "2015ABCD01")).rejects.toThrow("db down");
    await expect(
      hasTeamPermission("JAL", "2015ABCD01", "team.ranks"),
    ).rejects.toThrow("db down");
  });
});
