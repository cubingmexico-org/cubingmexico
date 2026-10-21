import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { CERTIFICATE_DESIGN_TEMPLATES } from "@/data/certificates";

const templateId = (module: string): string => {
  const template = CERTIFICATE_DESIGN_TEMPLATES.find(
    (t) => t.module === module,
  );
  if (!template) {
    throw new Error(`Missing built-in template for module ${module}`);
  }
  return template.id;
};

export const GLOBAL_PODIUM_TEMPLATE_ID = templateId("certificate_podium");
export const GLOBAL_PARTICIPATION_TEMPLATE_ID = templateId(
  "certificate_participation",
);

/**
 * Upserts built-in Cubing México certificate templates.
 * Safe to call on every templates list request: rows are only rewritten
 * when the bundled template differs from the stored one.
 */
export async function ensureGlobalDesignTemplates(): Promise<void> {
  await db
    .insert(design)
    .values(
      CERTIFICATE_DESIGN_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        competitionId: null,
        userId: "system",
        module: template.module,
        schemaVersion: 1,
        json: template.document,
        isPublic: true,
        ownerScope: "global" as const,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: design.id,
      set: {
        name: sql`excluded.name`,
        module: sql`excluded.module`,
        json: sql`excluded.json`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: sql`${design.name} is distinct from excluded.name
        or ${design.module} is distinct from excluded.module
        or ${design.json} is distinct from excluded.json`,
    });
}
