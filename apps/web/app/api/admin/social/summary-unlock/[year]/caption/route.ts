import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  fetchSocialCaption,
  type SocialPostType,
} from "@/app/(root)/admin/_lib/social";

export const maxDuration = 30;

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

  const postType: SocialPostType = "summary_unlock";

  try {
    const result = await fetchSocialCaption(postType, key);
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
      postType,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error fetching SUMMARY_UNLOCK caption",
      },
      { status: 502 },
    );
  }
}
