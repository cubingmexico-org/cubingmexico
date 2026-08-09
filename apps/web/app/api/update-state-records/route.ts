import { NextResponse } from "next/server";
import { getSessionUserId, hasTeamPermission } from "@/lib/team-auth";
import { invalidateAfterStateRecordsChange } from "@/lib/cache-tags";
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
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await updateStateRecords(stateId);
    invalidateAfterStateRecordsChange(result.personIds);

    return NextResponse.json({
      success: true,
      message: "State records updated successfully for the given stateId",
      singleCount: result.singleCount,
      averageCount: result.averageCount,
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
