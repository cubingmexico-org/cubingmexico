import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { person, teamMember } from "@workspace/db/schema";
import { deleteMembers, updateMember, updateMemberRole } from "./actions";
import { insertPerson, insertTeamMember } from "@/test/factories";
import { signIn } from "@/test/session";

const UNAUTHORIZED = { digest: "NEXT_HTTP_ERROR_FALLBACK;401" };

const ADMIN = "2015ADMN01";
const EDITOR = "2016EDIT01";
const MEMBER = "2017MEMB01";
const OTHER_STATE_MEMBER = "2018OTHE01";

function memberForm(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

async function roleOf(personId: string) {
  const rows = await db
    .select({ role: teamMember.role, specialties: teamMember.specialties })
    .from(teamMember)
    .where(eq(teamMember.personId, personId));
  return rows[0];
}

async function stateOf(wcaId: string) {
  const rows = await db
    .select({ stateId: person.stateId })
    .from(person)
    .where(eq(person.wcaId, wcaId));
  return rows[0]?.stateId ?? null;
}

beforeEach(async () => {
  await insertPerson({ wcaId: ADMIN, stateId: "JAL" });
  await insertPerson({ wcaId: EDITOR, stateId: "JAL" });
  await insertPerson({ wcaId: MEMBER, stateId: "JAL" });
  await insertPerson({ wcaId: OTHER_STATE_MEMBER, stateId: "CMX" });
  await insertTeamMember({ personId: ADMIN, role: "admin" });
  await insertTeamMember({ personId: EDITOR, role: "editor" });
});

describe("updateMember", () => {
  const form = () =>
    memberForm({ stateId: "JAL", personId: MEMBER, specialties: "3x3, OH" });

  it("rejects anonymous users and team outsiders", async () => {
    await expect(updateMember(null, form())).rejects.toMatchObject(
      UNAUTHORIZED,
    );

    signIn(MEMBER);
    await expect(updateMember(null, form())).rejects.toMatchObject(
      UNAUTHORIZED,
    );
    expect(await roleOf(MEMBER)).toBeUndefined();
  });

  it("rejects editors of another state's team", async () => {
    signIn(EDITOR);
    await expect(
      updateMember(
        null,
        memberForm({ stateId: "CMX", personId: OTHER_STATE_MEMBER }),
      ),
    ).rejects.toMatchObject(UNAUTHORIZED);
  });

  it("lets an editor save a member's specialties", async () => {
    signIn(EDITOR);
    const result = await updateMember(null, form());

    expect(result.success).toBe(true);
    expect((await roleOf(MEMBER))?.specialties).toEqual(["3x3", "OH"]);
  });
});

describe("updateMemberRole", () => {
  it("is reserved for team admins", async () => {
    signIn(EDITOR);
    await expect(
      updateMemberRole({ personId: MEMBER, stateId: "JAL", role: "admin" }),
    ).rejects.toMatchObject(UNAUTHORIZED);
    expect(await roleOf(MEMBER)).toBeUndefined();
  });

  it("lets an admin change a member's role", async () => {
    signIn(ADMIN);
    const result = await updateMemberRole({
      personId: MEMBER,
      stateId: "JAL",
      role: "editor",
    });

    expect(result.error).toBeNull();
    expect((await roleOf(MEMBER))?.role).toBe("editor");
  });

  it("refuses people from another state's team", async () => {
    signIn(ADMIN);
    const result = await updateMemberRole({
      personId: OTHER_STATE_MEMBER,
      stateId: "JAL",
      role: "admin",
    });

    expect(result.error).toBe("El miembro no pertenece a este team");
    expect(await roleOf(OTHER_STATE_MEMBER)).toBeUndefined();
  });
});

describe("deleteMembers", () => {
  it("rejects users without the members permission", async () => {
    signIn(MEMBER);
    await expect(
      deleteMembers({ ids: [EDITOR], stateId: "JAL" }),
    ).rejects.toMatchObject(UNAUTHORIZED);
    expect((await roleOf(EDITOR))?.role).toBe("editor");
  });

  it("only removes people from the editor's own team", async () => {
    signIn(EDITOR);
    const result = await deleteMembers({
      ids: [MEMBER, OTHER_STATE_MEMBER],
      stateId: "JAL",
    });

    expect(result.error).toBeNull();
    expect(await stateOf(MEMBER)).toBeNull();
    expect(await stateOf(OTHER_STATE_MEMBER)).toBe("CMX");
  });
});

describe("updateMember across teams", () => {
  it("refuses to edit someone from another team", async () => {
    signIn(EDITOR);
    const result = await updateMember(
      null,
      memberForm({
        stateId: "JAL",
        personId: OTHER_STATE_MEMBER,
        specialties: "333",
      }),
    );

    expect(result.success).toBe(false);
    expect(await roleOf(OTHER_STATE_MEMBER)).toBeUndefined();
  });
});
