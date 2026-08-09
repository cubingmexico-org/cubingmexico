import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { getPersonsWithoutState } from "@/db/queries";
import { getSessionUserId, hasTeamPermission } from "@/lib/team-auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const stateId = searchParams.get("stateId");

    if (!stateId) {
      return NextResponse.json(
        { success: false, message: "stateId is required" },
        { status: 400 },
      );
    }

    const userId = await getSessionUserId();
    if (
      !userId ||
      !(await hasTeamPermission(stateId, userId, "team.members"))
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const results = await getPersonsWithoutState({
      search: search || "",
    });

    return NextResponse.json({
      success: true,
      data: results,
      message: "Persons without state retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Error retrieving persons" },
      { status: 500 },
    );
  }
}
