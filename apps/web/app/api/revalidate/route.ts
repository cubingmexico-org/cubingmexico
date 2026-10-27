import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import * as z from "zod";
import { hasCronAuth } from "@/lib/cron-auth";
import { parseJsonBody } from "@/lib/route-input";

/** Tags the backend may revalidate after its data jobs (see apps/backend/web_cache.py). */
const REVALIDATABLE_TAGS = new Set(["cc-results", "data-source-dates"]);

const bodySchema = z.object({
  tags: z.array(
    z.string().refine((tag) => REVALIDATABLE_TAGS.has(tag), {
      message: "Invalid tags",
    }),
  ),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasCronAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const input = await parseJsonBody(request, bodySchema);
  if (input.response) return input.response;
  const { tags } = input.data;

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
  return NextResponse.json({ success: true, revalidated: tags });
}
