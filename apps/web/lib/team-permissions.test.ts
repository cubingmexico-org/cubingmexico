import { describe, expect, it } from "vitest";
import { canManageTeam, roleHasPermission } from "@/lib/team-permissions";

describe("roleHasPermission", () => {
  it("grants admin all team permissions", () => {
    expect(roleHasPermission("admin", "team.settings")).toBe(true);
    expect(roleHasPermission("admin", "team.media")).toBe(true);
    expect(roleHasPermission("admin", "team.members")).toBe(true);
    expect(roleHasPermission("admin", "team.roles")).toBe(true);
    expect(roleHasPermission("admin", "team.ranks")).toBe(true);
  });

  it("limits editor permissions", () => {
    expect(roleHasPermission("editor", "team.settings")).toBe(true);
    expect(roleHasPermission("editor", "team.media")).toBe(true);
    expect(roleHasPermission("editor", "team.members")).toBe(true);
    expect(roleHasPermission("editor", "team.roles")).toBe(false);
    expect(roleHasPermission("editor", "team.ranks")).toBe(false);
  });

  it("denies null role", () => {
    expect(roleHasPermission(null, "team.members")).toBe(false);
  });
});

describe("canManageTeam", () => {
  it("allows admin and editor", () => {
    expect(canManageTeam("admin")).toBe(true);
    expect(canManageTeam("editor")).toBe(true);
    expect(canManageTeam(null)).toBe(false);
  });
});
