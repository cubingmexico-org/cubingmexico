import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { person } from "@workspace/db/schema";
import { profileFormAction } from "./actions";
import { insertPerson } from "@/test/factories";
import { signIn } from "@/test/session";

const UNAUTHORIZED = { digest: "NEXT_HTTP_ERROR_FALLBACK;401" };

const EDITOR = "2016EDIT01";
const MEMBER = "2017MEMB01";
const NEWCOMER = "2020NEWC01";

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

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

beforeEach(async () => {
  await insertPerson({ wcaId: EDITOR, stateId: "JAL" });
  await insertPerson({ wcaId: MEMBER, stateId: "JAL" });
  await insertPerson({ wcaId: NEWCOMER });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("profileFormAction", () => {
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
