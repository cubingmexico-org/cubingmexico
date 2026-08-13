import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import {
  markSocialPosted,
  type SocialPostType,
} from "@/app/(root)/admin/_lib/social";

export const maxDuration = 30;

type Params = { params: Promise<{ month: string }> };

export async function POST(
  request: Request,
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

  const { month } = await params;
  const key = month?.trim();
  if (!key) {
    return NextResponse.json(
      { success: false, message: "month required" },
      { status: 400 },
    );
  }

  let platforms: string[] | undefined;
  try {
    const json = (await request.json()) as { platforms?: string[] };
    platforms = json.platforms;
  } catch {
    platforms = undefined;
  }

  const postType: SocialPostType = "streaks_monthly";

  try {
    const result = await markSocialPosted(postType, key, platforms);
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
            : "Error marking STREAKS_MONTHLY as posted",
      },
      { status: 502 },
    );
  }
}
