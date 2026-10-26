import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { hasCronAuth } from "@/lib/cron-auth";

/** Tags the backend may revalidate after its data jobs (see apps/backend/web_cache.py). */
const REVALIDATABLE_TAGS = new Set(["cc-results", "data-source-dates"]);

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasCronAuth(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let tags: unknown;
  try {
    ({ tags } = (await request.json()) as { tags?: unknown });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(tags) ||
    !tags.every((tag) => typeof tag === "string" && REVALIDATABLE_TAGS.has(tag))
  ) {
    return NextResponse.json(
      { success: false, message: "Invalid tags" },
      { status: 400 },
    );
  }

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
  return NextResponse.json({ success: true, revalidated: tags });
}
