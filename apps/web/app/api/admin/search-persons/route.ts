import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { searchPersons } from "@/app/(root)/admin/_lib/queries";

export async function GET(request: Request): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";

  const results = await searchPersons(search);

  return NextResponse.json({
    success: true,
    data: results,
  });
}
