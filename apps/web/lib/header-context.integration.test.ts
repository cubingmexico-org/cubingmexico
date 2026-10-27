import { describe, expect, it, vi } from "vitest";
import { getHeaderContextAction } from "./header-context";
import { insertPerson, insertTeam, insertTeamMember } from "@/test/factories";
import { signIn } from "@/test/session";

const EDITOR = "2016EDIT01";
const SUPERADMIN = "2015SUPE01";

describe("getHeaderContextAction", () => {
  it("answers for the session user only", async () => {
    vi.stubEnv("SUPERADMIN_WCA_IDS", SUPERADMIN);
    await insertTeam({ stateId: "JAL", name: "Team Jalisco" });
    await insertPerson({ wcaId: EDITOR, stateId: "JAL" });
    await insertTeamMember({ personId: EDITOR, role: "editor" });
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
