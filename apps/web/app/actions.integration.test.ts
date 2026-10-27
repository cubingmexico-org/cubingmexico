import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { person, team, teamMember } from "@workspace/db/schema";
import {
  addMemberFormAction,
  deleteTeamLogoAction,
  getHeaderContextAction,
  profileFormAction,
  teamFormAction,
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

const EDITOR = "2016EDIT01";
const MEMBER = "2017MEMB01";
const SUPERADMIN = "2015SUPE01";

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

async function teamRow(stateId: string) {
  const rows = await db.select().from(team).where(eq(team.stateId, stateId));
  return rows[0];
}

beforeEach(async () => {
  await insertTeam({ stateId: "JAL", name: "Team Jalisco" });
  await insertPerson({ wcaId: EDITOR, stateId: "JAL" });
  await insertPerson({ wcaId: MEMBER, stateId: "JAL" });
  await insertTeamMember({ personId: EDITOR, role: "editor" });
});

describe("teamFormAction", () => {
  const teamForm = () =>
    form({ stateId: "JAL", name: "Jalisco Cubers", description: "" });

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

/** Answers the state-ranks and state-records backend calls with an empty success. */
function stubBackend(ok = true) {
  vi.stubEnv("BACKEND_URL", "https://backend.example");
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        ok ? { success: true, personIds: [] } : { success: false },
        { status: ok ? 200 : 500 },
      ),
    ),
  );
}

async function personRow(wcaId: string) {
  const rows = await db.select().from(person).where(eq(person.wcaId, wcaId));
  return rows[0];
}

describe("profileFormAction", () => {
  const NEWCOMER = "2020NEWC01";

  beforeEach(async () => {
    await insertPerson({ wcaId: NEWCOMER });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("only lets people edit their own profile", async () => {
    signIn(EDITOR);
    await expect(
      profileFormAction(null, form({ stateId: "CMX", personId: MEMBER })),
    ).rejects.toMatchObject(UNAUTHORIZED);
  });

  it("lets a person without a state pick one", async () => {
    stubBackend();
    signIn(NEWCOMER);

    const result = await profileFormAction(
      null,
      form({ stateId: "CMX", personId: NEWCOMER }),
    );

    expect(result).toMatchObject({
      success: true,
      errors: null,
      warning: null,
    });
    expect((await personRow(NEWCOMER))?.stateId).toBe("CMX");
  });

  it("refuses to change a state that's already set", async () => {
    stubBackend();
    signIn(MEMBER);

    const result = await profileFormAction(
      null,
      form({ stateId: "CMX", personId: MEMBER }),
    );

    expect(result.success).toBe(false);
    expect(result.errors).toMatch(/Ya tienes un estado/);
    expect((await personRow(MEMBER))?.stateId).toBe("JAL");
  });

  it("keeps the change when the backend can't recompute ranks", async () => {
    stubBackend(false);
    signIn(NEWCOMER);

    const result = await profileFormAction(
      null,
      form({ stateId: "CMX", personId: NEWCOMER }),
    );

    expect(result.success).toBe(true);
    expect(result.warning).toMatch(/se actualizarán más tarde/);
    expect((await personRow(NEWCOMER))?.stateId).toBe("CMX");
  });
});

describe("addMemberFormAction", () => {
  const NEWCOMER = "2020NEWC01";
  const OTHER_TEAM = "2018OTHE01";

  beforeEach(async () => {
    await insertPerson({ wcaId: NEWCOMER });
    await insertPerson({ wcaId: OTHER_TEAM, stateId: "CMX" });
    stubBackend();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds a person without a state to the team", async () => {
    signIn(EDITOR);

    const result = await addMemberFormAction(
      null,
      form({ stateId: "JAL", personId: NEWCOMER, specialties: "333,444" }),
    );

    expect(result.success).toBe(true);
    expect((await personRow(NEWCOMER))?.stateId).toBe("JAL");
    const [member] = await db
      .select()
      .from(teamMember)
      .where(eq(teamMember.personId, NEWCOMER));
    expect(member?.specialties).toEqual(["333", "444"]);
  });

  it("refuses to pull someone out of another team", async () => {
    signIn(EDITOR);

    const result = await addMemberFormAction(
      null,
      form({ stateId: "JAL", personId: OTHER_TEAM }),
    );

    expect(result.success).toBe(false);
    expect((await personRow(OTHER_TEAM))?.stateId).toBe("CMX");
  });
});

describe("getHeaderContextAction", () => {
  it("answers for the session user only", async () => {
    vi.stubEnv("SUPERADMIN_WCA_IDS", SUPERADMIN);
    await insertPerson({ wcaId: SUPERADMIN });

    expect(await getHeaderContextAction()).toBeNull();

    signIn(EDITOR);
    expect(await getHeaderContextAction()).toEqual({
      team: { id: "JAL", name: "Team Jalisco" },
      isSuperadmin: false,
    });

    signIn(SUPERADMIN);
    expect(await getHeaderContextAction()).toEqual({
      team: null,
      isSuperadmin: true,
    });
  });
});
