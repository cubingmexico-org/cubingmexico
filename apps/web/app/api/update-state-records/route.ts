import { NextResponse } from "next/server";
import * as z from "zod";
import { getSessionUserId, hasTeamPermission } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { invalidateAfterStateRecordsChange } from "@/lib/cache-tags";
import { reportError } from "@/lib/report-error";
import { parseJsonBody, stateIdSchema } from "@/lib/route-input";
import { updateStateRecords } from "@/lib/state-updates";

const bodySchema = z.object({ stateId: stateIdSchema });

export async function POST(req: Request): Promise<NextResponse> {
  const input = await parseJsonBody(req, bodySchema);
  if (input.response) return input.response;
  const { stateId } = input.data;

  try {
    const userId = await getSessionUserId();
    if (!userId || !(await hasTeamPermission(stateId, userId, "team.ranks"))) {
      return unauthorizedResponse(userId);
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
    const isInvalidState =
      error instanceof Error && error.message === "Invalid stateId";
    if (!isInvalidState) reportError(error, { stateId });
    return NextResponse.json(
      {
        success: false,
        message: isInvalidState ? "Invalid stateId" : "Error updating database",
      },
      { status: isInvalidState ? 404 : 500 },
    );
  }
}
