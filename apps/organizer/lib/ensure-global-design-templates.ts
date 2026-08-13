import { db } from "@workspace/db";
import { design } from "@workspace/db/schema";
import { podium, participation } from "@/data/certificates";

const DEFAULT_PAGE_CONFIG = {
  pageSize: "LETTER" as const,
  pageOrientation: "portrait" as const,
  pageMargins: [40, 60, 40, 60] as [number, number, number, number],
};

/** Stable IDs so ensureGlobalDesignTemplates is idempotent. */
export const GLOBAL_PODIUM_TEMPLATE_ID =
  "00000000-0000-4000-8000-000000000001";
export const GLOBAL_PARTICIPATION_TEMPLATE_ID =
  "00000000-0000-4000-8000-000000000002";

const GLOBAL_TEMPLATES = [
  {
    id: GLOBAL_PODIUM_TEMPLATE_ID,
    name: "Certificado de podio (Cubing México)",
    module: "certificate_podium" as const,
    json: {
      content: podium,
      pageConfig: DEFAULT_PAGE_CONFIG,
    },
  },
  {
    id: GLOBAL_PARTICIPATION_TEMPLATE_ID,
    name: "Certificado de participación (Cubing México)",
    module: "certificate_participation" as const,
    json: {
      content: participation,
      pageConfig: DEFAULT_PAGE_CONFIG,
    },
  },
];

/**
 * Upserts built-in Cubing México certificate templates.
 * Safe to call on every templates list request.
 */
export async function ensureGlobalDesignTemplates(): Promise<void> {
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
        json: template.json,
        isPublic: true,
        ownerScope: "global" as const,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoNothing();
}
