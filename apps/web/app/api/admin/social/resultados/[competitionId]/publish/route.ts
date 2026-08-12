import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { publishResultados } from "@/app/(root)/admin/_lib/social";

export const maxDuration = 120;

type Params = { params: Promise<{ competitionId: string }> };

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

  const { competitionId } = await params;
  if (!competitionId?.trim()) {
    return NextResponse.json(
      { success: false, message: "competitionId required" },
      { status: 400 },
    );
  }

  try {
    const result = await publishResultados(competitionId.trim());
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
            : "Error publishing RESULTADOS",
      },
      { status: 502 },
    );
  }
}
