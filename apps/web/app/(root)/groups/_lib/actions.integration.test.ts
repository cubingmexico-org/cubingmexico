import { beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { groupMembership, person } from "@workspace/db/schema";
import { group } from "@workspace/db/schema";
import {
  addGroupMemberFormAction,
  deleteGroupAction,
  deleteGroupMembers,
  setSponsorshipAction,
  updateGroupMember,
  updateGroupMemberRole,
} from "./actions";
import {
  insertGroup,
  insertGroupMembership,
  insertPerson,
  insertTeam,
} from "@/test/factories";
import { signIn } from "@/test/session";

const UNAUTHORIZED = { digest: "NEXT_HTTP_ERROR_FALLBACK;401" };

const ADMIN = "2015GADM01";
const MEMBER = "2017GMEM01";
const OTHER = "2018GOTR01";

function memberForm(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function stubBackend() {
  vi.stubEnv("BACKEND_URL", "https://backend.example");
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ success: true, personIds: [] })),
  );
}

beforeEach(async () => {
  stubBackend();
  await insertTeam({ stateId: "JAL", name: "Team Jalisco" });
  await insertGroup({
    id: "vallarta",
    kind: "community",
    name: "Vallarta Speed",
  });
  await insertGroup({
    id: "cubos-dany",
    kind: "sponsor",
    name: "Cubos Dany",
  });
  await insertPerson({ wcaId: ADMIN, stateId: "JAL" });
  await insertPerson({ wcaId: MEMBER, stateId: "JAL" });
  await insertPerson({ wcaId: OTHER, stateId: null });
  await insertGroupMembership({
    groupId: "vallarta",
    personId: ADMIN,
    role: "admin",
  });
});

describe("addGroupMemberFormAction", () => {
  it("rejects anonymous users", async () => {
    await expect(
      addGroupMemberFormAction(
        null,
        memberForm({ groupId: "vallarta", personId: MEMBER }),
      ),
    ).rejects.toMatchObject(UNAUTHORIZED);
  });

  it("adds a member without changing persons.stateId", async () => {
    signIn(ADMIN);
    const result = await addGroupMemberFormAction(
      null,
      memberForm({ groupId: "vallarta", personId: OTHER }),
    );
    expect(result.success).toBe(true);

    const [membership] = await db
      .select()
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, "vallarta"),
          eq(groupMembership.personId, OTHER),
        ),
      );
    expect(membership).toBeTruthy();

    const [row] = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, OTHER));
    expect(row?.stateId).toBeNull();
  });

  it("allows the same person in a community and a sponsor team", async () => {
    signIn(ADMIN);
    await insertGroupMembership({
      groupId: "cubos-dany",
      personId: ADMIN,
      role: "admin",
    });

    await addGroupMemberFormAction(
      null,
      memberForm({ groupId: "vallarta", personId: MEMBER }),
    );
    await addGroupMemberFormAction(
      null,
      memberForm({ groupId: "cubos-dany", personId: MEMBER }),
    );

    const rows = await db
      .select({ groupId: groupMembership.groupId })
      .from(groupMembership)
      .where(eq(groupMembership.personId, MEMBER));
    expect(rows.map((r) => r.groupId).sort()).toEqual([
      "cubos-dany",
      "vallarta",
    ]);

    const [row] = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, MEMBER));
    expect(row?.stateId).toBe("JAL");
  });
});

describe("deleteGroupMembers", () => {
  it("removes membership only", async () => {
    signIn(ADMIN);
    await insertGroupMembership({ groupId: "vallarta", personId: MEMBER });

    const result = await deleteGroupMembers({
      groupId: "vallarta",
      ids: [MEMBER],
    });
    expect(result.error).toBeNull();

    const rows = await db
      .select()
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, "vallarta"),
          eq(groupMembership.personId, MEMBER),
        ),
      );
    expect(rows).toHaveLength(0);

    const [row] = await db
      .select({ stateId: person.stateId })
      .from(person)
      .where(eq(person.wcaId, MEMBER));
    expect(row?.stateId).toBe("JAL");
  });
});

describe("updateGroupMember", () => {
  it("updates specialties for an existing member", async () => {
    signIn(ADMIN);
    await insertGroupMembership({ groupId: "vallarta", personId: MEMBER });

    const result = await updateGroupMember(
      null,
      memberForm({
        groupId: "vallarta",
        personId: MEMBER,
        specialties: "333,444",
      }),
    );
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ specialties: groupMembership.specialties })
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, "vallarta"),
          eq(groupMembership.personId, MEMBER),
        ),
      );
    expect(row?.specialties).toEqual(["333", "444"]);
  });
});

describe("updateGroupMemberRole", () => {
  it("lets an admin assign editor", async () => {
    signIn(ADMIN);
    await insertGroupMembership({ groupId: "vallarta", personId: MEMBER });

    const result = await updateGroupMemberRole({
      groupId: "vallarta",
      personId: MEMBER,
      role: "editor",
    });
    expect(result.error).toBeNull();

    const [row] = await db
      .select({ role: groupMembership.role })
      .from(groupMembership)
      .where(
        and(
          eq(groupMembership.groupId, "vallarta"),
          eq(groupMembership.personId, MEMBER),
        ),
      );
    expect(row?.role).toBe("editor");
  });
});

describe("setSponsorshipAction", () => {
  it("is reserved for superadmins", async () => {
    signIn(ADMIN);
    await expect(
      setSponsorshipAction({
        groupId: "cubos-dany",
        sponsorshipStatus: "active",
        publicityEnabled: true,
      }),
    ).rejects.toMatchObject(UNAUTHORIZED);
  });

  it("lets a superadmin activate publicity", async () => {
    const SUPERADMIN = "2015SUPE01";
    vi.stubEnv("SUPERADMIN_WCA_IDS", SUPERADMIN);
    await insertPerson({ wcaId: SUPERADMIN });
    signIn(SUPERADMIN);

    const result = await setSponsorshipAction({
      groupId: "cubos-dany",
      sponsorshipStatus: "active",
      publicityEnabled: true,
    });
    expect(result.error).toBeNull();
  });
});

describe("deleteGroupAction", () => {
  it("is reserved for superadmins", async () => {
    signIn(ADMIN);
    await expect(deleteGroupAction("vallarta")).rejects.toMatchObject(
      UNAUTHORIZED,
    );
    const [row] = await db
      .select({ id: group.id })
      .from(group)
      .where(eq(group.id, "vallarta"));
    expect(row?.id).toBe("vallarta");
  });

  it("lets a superadmin hard-delete a group", async () => {
    const SUPERADMIN = "2015SUPE01";
    vi.stubEnv("SUPERADMIN_WCA_IDS", SUPERADMIN);
    await insertPerson({ wcaId: SUPERADMIN });
    signIn(SUPERADMIN);

    await expect(deleteGroupAction("vallarta")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    const rows = await db
      .select({ id: group.id })
      .from(group)
      .where(eq(group.id, "vallarta"));
    expect(rows).toHaveLength(0);

    const memberships = await db
      .select()
      .from(groupMembership)
      .where(eq(groupMembership.groupId, "vallarta"));
    expect(memberships).toHaveLength(0);
  });
});
