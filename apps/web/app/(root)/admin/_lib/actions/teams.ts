"use server";

import { db } from "@workspace/db";
import { team } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { createTeam } from "@/db/mutations";
import { getErrorMessage } from "@/lib/handle-error";
import { requireSuperadmin } from "@/lib/superadmin";

const createTeamSchema = z.object({
  stateId: z.string().min(1).max(3),
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(2000).optional().nullable(),
});

export async function createTeamAction(
  input: z.infer<typeof createTeamSchema>,
) {
  try {
    await requireSuperadmin();
    const data = createTeamSchema.parse(input);

    const [existing] = await db
      .select({ stateId: team.stateId })
      .from(team)
      .where(eq(team.stateId, data.stateId))
      .limit(1);

    if (existing) {
      return { data: null, error: "Ya existe un team para ese estado" };
    }

    await createTeam({
      stateId: data.stateId,
      name: data.name,
      description: data.description ?? null,
    });

    updateTag(`team-info-${data.stateId}`);
    updateTag("sitemap");

    return { data: { stateId: data.stateId }, error: null };
  } catch (error) {
    return { data: null, error: getErrorMessage(error) };
  }
}
