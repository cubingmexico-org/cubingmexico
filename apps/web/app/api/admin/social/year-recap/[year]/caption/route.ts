import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { fetchSocialCaption } from "@/app/(root)/admin/_lib/social";

export const maxDuration = 30;

type Params = { params: Promise<{ year: string }> };

export async function GET(
  _request: Request,
  { params }: Params,
): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return unauthorizedResponse(userId);
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
    const result = await fetchSocialCaption("year_recap", key);
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
      caption: result.caption,
      facebookCaption: result.facebookCaption,
      instagramCaption: result.instagramCaption,
      year: key,
      postType: "year_recap",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error fetching YEAR_RECAP caption",
      },
      { status: 502 },
    );
  }
}
