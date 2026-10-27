import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { team } from "@workspace/db/schema";
import {
  isSuperadminAction,
  profileFormAction,
  teamFormAction,
  updateTeamLogoAction,
} from "./actions";
import { insertPerson, insertTeam, insertTeamMember } from "@/test/factories";
import { signIn } from "@/test/session";

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
  it("rejects anonymous users", async () => {
    await expect(
      updateTeamLogoAction("JAL", "https://example.com/logo.png"),
    ).rejects.toMatchObject(UNAUTHORIZED);
    expect((await teamRow("JAL"))?.image).toBeNull();
  });

  it("lets an editor change the logo", async () => {
    signIn(EDITOR);
    await updateTeamLogoAction("JAL", "https://example.com/logo.png");
    expect((await teamRow("JAL"))?.image).toBe("https://example.com/logo.png");
  });
});

describe("profileFormAction", () => {
  it("only lets people edit their own profile", async () => {
    signIn(EDITOR);
    await expect(
      profileFormAction(null, form({ stateId: "CMX", personId: MEMBER })),
    ).rejects.toMatchObject(UNAUTHORIZED);
  });
});

describe("isSuperadminAction", () => {
  it("only answers for the signed-in user", async () => {
    vi.stubEnv("SUPERADMIN_WCA_IDS", SUPERADMIN);

    signIn(EDITOR);
    expect(await isSuperadminAction(SUPERADMIN)).toBe(false);

    signIn(SUPERADMIN);
    expect(await isSuperadminAction(SUPERADMIN)).toBe(true);
  });
});
