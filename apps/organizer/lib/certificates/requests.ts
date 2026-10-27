import { z } from "zod";

export const competitionIdSchema = z.string().regex(/^[A-Za-z0-9]+$/);

export const podiumRequestSchema = z.object({
  competitionId: competitionIdSchema,
  filterByCountry: z.boolean().default(false),
  country: z.string().nullish(),
  template: z.enum(["general", "female", "newcomer", "age"]),
  minAge: z.number().int().min(0).optional(),
  maxAge: z.number().int().min(0).optional(),
  birthdates: z
    .array(z.tuple([z.number().int(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]))
    .optional(),
});

export type PodiumRequest = z.input<typeof podiumRequestSchema>;
