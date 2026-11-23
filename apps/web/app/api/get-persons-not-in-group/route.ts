import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import * as z from "zod";
import { getPersonsNotInGroup } from "@/app/(root)/groups/_lib/person-search";
import { unauthorizedResponse } from "@/lib/api-auth";
import { getSessionUserId, hasGroupPermission } from "@/lib/group-auth";
import { reportError } from "@/lib/report-error";
import { parseSearchParams } from "@/lib/route-input";

const querySchema = z.object({
  groupId: z.string().min(1),
  search: z.string().default(""),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();

  const input = parseSearchParams(request.nextUrl.searchParams, querySchema);
  if (input.response) return input.response;
  const { groupId, search } = input.data;

  try {
    const userId = await getSessionUserId();
    if (
      !userId ||
      !(await hasGroupPermission(groupId, userId, "group.members"))
    ) {
      return unauthorizedResponse(userId);
    }

    const results = await getPersonsNotInGroup({ groupId, search });

    return NextResponse.json({
      success: true,
      data: results,
      message: "Persons not in group retrieved successfully",
    });
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      { success: false, message: "Error retrieving persons" },
      { status: 500 },
    );
  }
}
