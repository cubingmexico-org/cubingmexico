import { NextResponse } from "next/server";
import * as z from "zod";
import { getSessionUserId, hasGroupPermission } from "@/lib/group-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { invalidateAfterGroupRecordsChange } from "@/lib/cache-tags";
import { reportError } from "@/lib/report-error";
import { parseJsonBody } from "@/lib/route-input";
import { updateGroupRanks, updateGroupRecords } from "@/lib/group-updates";

const bodySchema = z.object({
  groupId: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z0-9-]+$/),
});

export async function POST(req: Request): Promise<NextResponse> {
  const input = await parseJsonBody(req, bodySchema);
  if (input.response) return input.response;
  const { groupId } = input.data;

  try {
    const userId = await getSessionUserId();
    if (
      !userId ||
      !(await hasGroupPermission(groupId, userId, "group.ranks"))
    ) {
      return unauthorizedResponse(userId);
    }

    await updateGroupRanks(groupId);
    const records = await updateGroupRecords(groupId);
    invalidateAfterGroupRecordsChange(records.personIds);

    return NextResponse.json({
      success: true,
      message: "Database updated successfully for the given groupId",
    });
  } catch (error) {
    const isInvalidGroup =
      error instanceof Error && error.message === "Invalid groupId";
    if (!isInvalidGroup) reportError(error, { groupId });
    return NextResponse.json(
      {
        success: false,
        message: isInvalidGroup ? "Invalid groupId" : "Error updating database",
      },
      { status: isInvalidGroup ? 404 : 500 },
    );
  }
}
