import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { person, teamMember } from "@workspace/db/schema";
import {
  assignPersonState,
  updateAdminMemberRole,
  updatePersonHideFromRoster,
} from "./people";
import { insertPerson } from "@/test/factories";
import { signIn } from "@/test/session";

const UNAUTHORIZED = { digest: "NEXT_HTTP_ERROR_FALLBACK;401" };

const SUPERADMIN = "2015SUPE01";
const USER = "2016USER01";
const MEMBER = "2017MEMB01";

async function personRow(wcaId: string) {
  const rows = await db.select().from(person).where(eq(person.wcaId, wcaId));
  return rows[0];
}

async function roleOf(personId: string) {
  const rows = await db
    .select({ role: teamMember.role })
    .from(teamMember)
    .where(eq(teamMember.personId, personId));
  return rows[0]?.role;
}

beforeEach(async () => {
  vi.stubEnv("SUPERADMIN_WCA_IDS", SUPERADMIN);
  await insertPerson({ wcaId: SUPERADMIN });
  await insertPerson({ wcaId: USER });
  await insertPerson({ wcaId: MEMBER, stateId: "JAL" });
});

describe("superadmin people actions", () => {
  it("reject anonymous users and non-superadmins", async () => {
    for (const userId of [null, USER]) {
      signIn(userId);
      await expect(
        updatePersonHideFromRoster({ personId: MEMBER, hideFromRoster: true }),
      ).rejects.toMatchObject(UNAUTHORIZED);
      await expect(
        updateAdminMemberRole({
          personId: MEMBER,
          stateId: "JAL",
          role: "admin",
        }),
      ).rejects.toMatchObject(UNAUTHORIZED);
      await expect(
        assignPersonState({ personId: MEMBER, stateId: null }),
      ).rejects.toMatchObject(UNAUTHORIZED);
    }

    expect((await personRow(MEMBER))?.hideFromRoster).toBe(false);
    expect((await personRow(MEMBER))?.stateId).toBe("JAL");
    expect(await roleOf(MEMBER)).toBeUndefined();
  });

  it("let a superadmin hide a person from the roster", async () => {
    signIn(SUPERADMIN);
    const result = await updatePersonHideFromRoster({
      personId: MEMBER,
      hideFromRoster: true,
    });

    expect(result.error).toBeNull();
    expect((await personRow(MEMBER))?.hideFromRoster).toBe(true);
  });

  it("let a superadmin set the role of a team member", async () => {
    signIn(SUPERADMIN);
    const result = await updateAdminMemberRole({
      personId: MEMBER,
      stateId: "JAL",
      role: "admin",
    });

    expect(result.error).toBeNull();
    expect(await roleOf(MEMBER)).toBe("admin");
  });

  it("refuse a role for someone outside the team", async () => {
    signIn(SUPERADMIN);
    const result = await updateAdminMemberRole({
      personId: MEMBER,
      stateId: "CMX",
      role: "admin",
    });

    expect(result.error).toBe("El miembro no pertenece a este team");
    expect(await roleOf(MEMBER)).toBeUndefined();
  });
});
