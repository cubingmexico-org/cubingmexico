import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { person, team, teamMember } from "@workspace/db/schema";
import {
  addMemberFormAction,
  deleteMembers,
  deleteTeamLogoAction,
  teamFormAction,
  updateMember,
  updateMemberRole,
  updateTeamLogoAction,
} from "./actions";
import { insertPerson, insertTeam, insertTeamMember } from "@/test/factories";
import { signIn } from "@/test/session";

const { deleteFiles } = vi.hoisted(() => ({
  deleteFiles: vi.fn(async () => ({ success: true, deletedCount: 1 })),
}));
vi.mock("uploadthing/server", () => ({
  UTApi: class {
    deleteFiles = deleteFiles;
  },
}));

const UNAUTHORIZED = { digest: "NEXT_HTTP_ERROR_FALLBACK;401" };

const ADMIN = "2015ADMN01";
const EDITOR = "2016EDIT01";
const MEMBER = "2017MEMB01";
const OTHER_STATE_MEMBER = "2018OTHE01";
const NEWCOMER = "2020NEWC01";

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

async function teamRow(stateId: string) {
  const rows = await db.select().from(team).where(eq(team.stateId, stateId));
  return rows[0];
}

/** Answers the state-ranks and state-records backend calls with an empty success. */
function stubBackend() {
  vi.stubEnv("BACKEND_URL", "https://backend.example");
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ success: true, personIds: [] })),
  );
}

beforeEach(async () => {
  await insertTeam({ stateId: "JAL", name: "Team Jalisco" });
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

describe("teamFormAction", () => {
  const teamForm = () =>
    memberForm({ stateId: "JAL", name: "Jalisco Cubers", description: "" });

  it("rejects members without the settings permission", async () => {
    signIn(MEMBER);
    await expect(teamFormAction(null, teamForm())).rejects.toMatchObject(
      UNAUTHORIZED,
    );
    expect((await teamRow("JAL"))?.name).toBe("Team Jalisco");
  });

  it("lets an editor save the team", async () => {
    signIn(EDITOR);
    const result = await teamFormAction(null, teamForm());

    expect(result.errors).toBeNull();
    expect((await teamRow("JAL"))?.name).toBe("Jalisco Cubers");
  });
});

describe("updateTeamLogoAction", () => {
  const OLD_LOGO = "https://app.ufs.sh/f/old-logo";
  const NEW_LOGO = "https://app.ufs.sh/f/new-logo";

  beforeEach(() => {
    vi.stubEnv("UPLOADTHING_TOKEN", "test-token");
    deleteFiles.mockClear();
  });

  it("rejects anonymous users", async () => {
    await expect(updateTeamLogoAction("JAL", NEW_LOGO)).rejects.toMatchObject(
      UNAUTHORIZED,
    );
    expect((await teamRow("JAL"))?.image).toBeNull();
  });

  it("only accepts UploadThing URLs", async () => {
    signIn(EDITOR);
    await expect(
      updateTeamLogoAction("JAL", "https://example.com/logo.png"),
    ).rejects.toThrow();
    expect((await teamRow("JAL"))?.image).toBeNull();
  });

  it("lets an editor change the logo and deletes the old file", async () => {
    await db
      .update(team)
      .set({ image: OLD_LOGO })
      .where(eq(team.stateId, "JAL"));
    signIn(EDITOR);

    await updateTeamLogoAction("JAL", NEW_LOGO);

    expect((await teamRow("JAL"))?.image).toBe(NEW_LOGO);
    expect(deleteFiles).toHaveBeenCalledExactlyOnceWith("old-logo");
  });

  it("keeps a file another row still uses", async () => {
    await insertTeam({ stateId: "CMX", coverImage: OLD_LOGO });
    await db
      .update(team)
      .set({ image: OLD_LOGO })
      .where(eq(team.stateId, "JAL"));
    signIn(EDITOR);

    await deleteTeamLogoAction("JAL");

    expect((await teamRow("JAL"))?.image).toBeNull();
    expect(deleteFiles).not.toHaveBeenCalled();
  });

  it("never deletes files UploadThing doesn't host", async () => {
    await db
      .update(team)
      .set({ image: "https://example.com/logo.png" })
      .where(eq(team.stateId, "JAL"));
    signIn(EDITOR);

    await updateTeamLogoAction("JAL", NEW_LOGO);

    expect(deleteFiles).not.toHaveBeenCalled();
  });
});

describe("addMemberFormAction", () => {
  beforeEach(async () => {
    await insertPerson({ wcaId: NEWCOMER });
    stubBackend();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds a person without a state to the team", async () => {
    signIn(EDITOR);

    const result = await addMemberFormAction(
      null,
      memberForm({
        stateId: "JAL",
        personId: NEWCOMER,
        specialties: "333,444",
      }),
    );

    expect(result.success).toBe(true);
    expect(await stateOf(NEWCOMER)).toBe("JAL");
    expect((await roleOf(NEWCOMER))?.specialties).toEqual(["333", "444"]);
  });

  it("refuses to pull someone out of another team", async () => {
    signIn(EDITOR);

    const result = await addMemberFormAction(
      null,
      memberForm({ stateId: "JAL", personId: OTHER_STATE_MEMBER }),
    );

    expect(result.success).toBe(false);
    expect(await stateOf(OTHER_STATE_MEMBER)).toBe("CMX");
  });
});
