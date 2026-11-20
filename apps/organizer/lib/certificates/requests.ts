import { z } from "zod";
import type { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import type { JSONContent } from "@tiptap/react";

export const competitionIdSchema = z.string().regex(/^[A-Za-z0-9]+$/);

export const podiumRequestSchema = z.object({
  competitionId: competitionIdSchema,
  filterByCountry: z.boolean().default(false),
  country: z.string().nullish(),
  template: z.enum(["general", "female", "newcomer", "age"]),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
});

export type PodiumRequest = z.input<typeof podiumRequestSchema>;

const marginsSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

export const EMAIL_BATCH_MAX = 10;

export const participationEmailRequestSchema = z.object({
  competitionId: competitionIdSchema,
  registrantIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(EMAIL_BATCH_MAX),
  content: z.custom<JSONContent>(
    (value) => !!value && typeof value === "object",
  ),
  pageMargins: z.custom<Margins>(
    (value) => marginsSchema.safeParse(value).success,
  ),
  pageOrientation: z.custom<PageOrientation>(
    (value) => value === "portrait" || value === "landscape",
  ),
  pageSize: z.custom<PageSize>(
    (value) =>
      typeof value === "string" ||
      (typeof value === "object" &&
        value !== null &&
        "width" in value &&
        "height" in value),
  ),
  background: z.string().optional(),
});

export type ParticipationEmailResponse = {
  sent: number;
  failed: { registrantId: number; error: string }[];
  skippedNoEmail: number[];
  dailyQuotaHit: boolean;
  monthlyQuotaHit: boolean;
};
