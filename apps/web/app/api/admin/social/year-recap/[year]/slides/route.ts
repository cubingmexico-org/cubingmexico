import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { fetchWeeklyDigestSlides } from "@/app/(root)/admin/_lib/social";

export const maxDuration = 60;

type Params = { params: Promise<{ year: string }> };

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

  const { year } = await params;
  const key = year?.trim();
  if (!key) {
    return NextResponse.json(
      { success: false, message: "year required" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchWeeklyDigestSlides(key, "year_recap");
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

    return NextResponse.json({
      success: true,
      count: result.count,
      slides: result.slides,
      year: key,
      postType: "year_recap",
      subjectKey: key,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error loading YEAR_RECAP slides",
      },
      { status: 502 },
    );
  }
}
