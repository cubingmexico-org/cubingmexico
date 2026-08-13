"use server";

import { updateTag } from "next/cache";

export async function revalidateWCIF(competitionId: string): Promise<void> {
  updateTag(`wcif-${competitionId}`);
}
