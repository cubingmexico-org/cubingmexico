import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { and, eq, notInArray, sql } from "drizzle-orm";
import type { DesignModule } from "@workspace/db/schema";
import { BADGE_DESIGN_TEMPLATES } from "@/data/badges";
import { CERTIFICATE_DESIGN_TEMPLATES } from "@/data/certificates";

const GLOBAL_TEMPLATES: {
  id: string;
  name: string;
  module: DesignModule;
  document: unknown;
}[] = [
  ...CERTIFICATE_DESIGN_TEMPLATES,
  ...BADGE_DESIGN_TEMPLATES.map((template) => ({
    ...template,
    module: "badges" as const,
  })),
];

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
 * Syncs the built-in Cubing México templates: upserts every bundled one and
 * deletes built-in rows that are no longer bundled.
 * Safe to call on every templates list request: rows are only rewritten
 * when the bundled template differs from the stored one.
 */
export async function ensureGlobalDesignTemplates(): Promise<void> {
  await db.delete(design).where(
    and(
      eq(design.ownerScope, "global"),
      eq(design.userId, "system"),
      notInArray(
        design.id,
        GLOBAL_TEMPLATES.map((template) => template.id),
      ),
    ),
  );

  await db
    .insert(design)
    .values(
      GLOBAL_TEMPLATES.map((template) => ({
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
