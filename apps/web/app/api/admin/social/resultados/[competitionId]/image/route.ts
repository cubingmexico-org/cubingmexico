import { connection, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/team-auth";
import { isSuperadmin } from "@/lib/superadmin";
import { fetchResultadosImage } from "@/app/(root)/admin/_lib/social";

export const maxDuration = 60;

type Params = { params: Promise<{ competitionId: string }> };

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

  const { competitionId } = await params;
  if (!competitionId?.trim()) {
    return NextResponse.json(
      { success: false, message: "competitionId required" },
      { status: 400 },
    );
  }

  try {
    const result = await fetchResultadosImage(competitionId.trim());
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
            : "Error generating RESULTADOS image",
      },
      { status: 502 },
    );
  }
}
