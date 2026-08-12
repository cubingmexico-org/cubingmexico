import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  publishSocialPost,
  type SocialPostType,
} from "@/app/(root)/admin/_lib/social";

export const maxDuration = 120;

type Params = { params: Promise<{ year: string }> };

export async function POST(
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
    const result = await publishSocialPost(postType, key);
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
          error instanceof Error
            ? error.message
            : "Error publishing SUMMARY_UNLOCK",
      },
      { status: 502 },
    );
  }
}
