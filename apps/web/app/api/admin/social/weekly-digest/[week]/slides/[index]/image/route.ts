import { connection, NextResponse } from "next/server";
import * as z from "zod";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { indexParamSchema, parseParams } from "@/lib/route-input";
import { isSuperadmin } from "@/lib/superadmin";
import { fetchWeeklyDigestSlideImage } from "@/app/(root)/admin/_lib/social";

export const maxDuration = 60;

type Params = { params: Promise<{ week: string; index: string }> };

const paramsSchema = z.object({
  week: z.string().trim().min(1, { message: "week required" }),
  index: indexParamSchema,
});

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return unauthorizedResponse(userId);
  }

  const input = parseParams(await params, paramsSchema);
  if (input.response) return input.response;
  const { week: key, index } = input.data;

  try {
    const result = await fetchWeeklyDigestSlideImage(key, index);
    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          status: result.status,
          data: result.body,
        },
        { status: result.status >= 400 ? result.status : 502 },
      );
    }

    return new NextResponse(result.bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
        "X-Slide-Id": result.slideId,
      },
    });
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error generating WEEKLY_DIGEST slide image",
      },
      { status: 502 },
    );
  }
}
