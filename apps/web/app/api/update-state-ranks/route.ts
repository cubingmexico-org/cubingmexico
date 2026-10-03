import { NextResponse } from "next/server";
import { getSessionUserId, hasTeamPermission } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { invalidateAfterStateRecordsChange } from "@/lib/cache-tags";
import { updateStateRanks } from "@/lib/update-state-ranks";
import { updateStateRecords } from "@/lib/update-state-records";

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
      return unauthorizedResponse(userId);
    }

    await updateStateRanks(stateId);
    const records = await updateStateRecords(stateId);
    invalidateAfterStateRecordsChange(records.personIds);

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
