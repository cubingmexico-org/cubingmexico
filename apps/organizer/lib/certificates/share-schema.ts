import { z } from "zod";
import type { JSONContent } from "@tiptap/react";
import type { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import { competitionIdSchema } from "@/lib/certificates/requests";

const marginsSchema = z.union([
  z.number(),
  z.tuple([z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

export const participationShareJsonSchema = z.object({
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

export type ParticipationShareJson = z.infer<
  typeof participationShareJsonSchema
>;

export const publishParticipationShareSchema = z.object({
  competitionId: competitionIdSchema,
  registrantIds: z.array(z.number().int().positive()).min(1).max(500),
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

export type PublishParticipationShareResponse = {
  token: string;
  claimUrl: string;
  competitionName: string;
  emails: string[];
  skippedNoEmail: number[];
};

export function newShareToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString(
    "base64url",
  );
}
