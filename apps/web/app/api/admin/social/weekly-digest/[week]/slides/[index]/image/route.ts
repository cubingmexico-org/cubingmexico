import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { fetchWeeklyDigestSlideImage } from "@/app/(root)/admin/_lib/social";

export const maxDuration = 60;

type Params = { params: Promise<{ week: string; index: string }> };

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { week, index: indexRaw } = await params;
  const key = week?.trim();
  const index = Number.parseInt(indexRaw ?? "", 10);
  if (!key) {
    return NextResponse.json(
      { success: false, message: "week required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json(
      { success: false, message: "invalid slide index" },
      { status: 400 },
    );
  }

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
    console.error(error);
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
