import { connection, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import * as z from "zod";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { parseJsonBody } from "@/lib/route-input";
import { isSuperadmin } from "@/lib/superadmin";
import {
  type AdminOpsPath,
  isAllowedOpsPath,
  OPS_JOB_CACHE_TAGS,
} from "@/app/(root)/admin/_lib/ops-jobs";
import { triggerBackendJob } from "@/app/(root)/admin/_lib/ops";

export const maxDuration = 300;

const bodySchema = z.object({
  path: z.custom<AdminOpsPath>(
    (value) => typeof value === "string" && isAllowedOpsPath(value),
    { message: "Invalid ops path" },
  ),
});

export async function POST(request: Request): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return unauthorizedResponse(userId);
  }

  const input = await parseJsonBody(request, bodySchema);
  if (input.response) return input.response;
  const { path } = input.data;

  try {
    const result = await triggerBackendJob(path);
    // 202: the backend started a Cloud Run Job, which revalidates these tags when it finishes.
    if (result.ok && result.status !== 202) {
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
    reportError(error);
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
