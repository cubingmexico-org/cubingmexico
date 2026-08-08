import { NextResponse } from "next/server";
import { getSessionUserId, hasTeamPermission } from "@/lib/team-auth";
import { updateStateRanks } from "@/lib/update-state-ranks";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { stateId } = await req.json();

    if (!stateId) {
      return NextResponse.json(
        { success: false, message: "stateId is required" },
        { status: 400 },
      );
    }

    const userId = await getSessionUserId();
    if (!userId || !(await hasTeamPermission(stateId, userId, "team.ranks"))) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    await updateStateRanks(stateId);

    return NextResponse.json({
      success: true,
      message: "Database updated successfully for the given stateId",
    });
  } catch (error) {
    console.error(error);
    const isInvalidState =
      error instanceof Error && error.message === "Invalid stateId";
    return NextResponse.json(
      {
        success: false,
        message: isInvalidState ? "Invalid stateId" : "Error updating database",
      },
      { status: isInvalidState ? 404 : 500 },
    );
  }
}
