import { connection, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  isAllowedOpsPath,
  OPS_JOB_CACHE_TAGS,
} from "@/app/(root)/admin/_lib/ops-jobs";
import { triggerBackendJob } from "@/app/(root)/admin/_lib/ops";

export const maxDuration = 300;

export async function POST(request: Request): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return unauthorizedResponse(userId);
  }

  let path: string | undefined;
  try {
    const json = (await request.json()) as { path?: string };
    path = json.path;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!path || !isAllowedOpsPath(path)) {
    return NextResponse.json(
      { success: false, message: "Invalid ops path" },
      { status: 400 },
    );
  }

  try {
    const result = await triggerBackendJob(path);
    if (result.ok) {
      for (const tag of OPS_JOB_CACHE_TAGS[path] ?? []) {
        revalidateTag(tag, "max");
      }
    }
    return NextResponse.json(
      {
        success: result.ok,
        status: result.status,
        data: result.body,
      },
      { status: result.ok ? 200 : result.status >= 400 ? result.status : 502 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error calling backend job",
      },
      { status: 502 },
    );
  }
}
