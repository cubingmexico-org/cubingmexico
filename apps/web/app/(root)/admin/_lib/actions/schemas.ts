import "server-only";

import { z } from "zod";

export const competitionIdSchema = z.object({
  competitionId: z.string().min(1),
});
