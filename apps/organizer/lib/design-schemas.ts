import { z } from "zod";

export const designModuleSchema = z.enum([
  "certificate_podium",
  "certificate_participation",
  "badges",
]);


export const createDesignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  competitionId: z.string().trim().min(1).max(32).nullable().optional(),
  module: designModuleSchema,
  json: z.unknown(),
  isPublic: z.boolean().optional().default(false),
  ownerScope: z.enum(["user", "org", "global"]).optional().default("user"),
  schemaVersion: z.number().int().positive().optional().default(1),
});

export const updateDesignSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  json: z.unknown().optional(),
  isPublic: z.boolean().optional(),
});

export const cloneDesignSchema = z.object({
  competitionId: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(120).optional(),
});

export type DesignListItem = {
  id: string;
  name: string;
  competitionId: string | null;
  userId: string;
  module: string;
  schemaVersion: number;
  isPublic: boolean;
  ownerScope: string;
  updatedAt: string;
  createdAt: string;
};

export function serializeDesign(
  row: {
    id: string;
    name: string;
    competitionId: string | null;
    userId: string;
    module: string;
    schemaVersion: number;
    json: unknown;
    isPublic: boolean;
    ownerScope: string;
    updatedAt: Date;
    createdAt: Date;
  },
  options?: { includeJson?: boolean },
) {
  const base: DesignListItem & { json?: unknown } = {
    id: row.id,
    name: row.name,
    competitionId: row.competitionId,
    userId: row.userId,
    module: row.module,
    schemaVersion: row.schemaVersion,
    isPublic: row.isPublic,
    ownerScope: row.ownerScope,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };

  if (options?.includeJson) {
    base.json = row.json;
  }

  return base;
}
