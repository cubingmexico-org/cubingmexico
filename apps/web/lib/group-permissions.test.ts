import { describe, expect, it } from "vitest";
import {
  canManageGroup,
  groupRoleHasPermission,
} from "./group-permissions";

describe("group permissions", () => {
  it("gives admins every permission and editors a subset", () => {
    expect(groupRoleHasPermission("admin", "group.ranks")).toBe(true);
    expect(groupRoleHasPermission("admin", "group.roles")).toBe(true);
    expect(groupRoleHasPermission("editor", "group.members")).toBe(true);
    expect(groupRoleHasPermission("editor", "group.ranks")).toBe(false);
    expect(groupRoleHasPermission(null, "group.settings")).toBe(false);
  });

  it("treats admin and editor as managers", () => {
    expect(canManageGroup("admin")).toBe(true);
    expect(canManageGroup("editor")).toBe(true);
    expect(canManageGroup(null)).toBe(false);
  });
});
