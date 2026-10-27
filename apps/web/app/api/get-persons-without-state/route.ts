import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import * as z from "zod";
import { getPersonsWithoutState } from "@/db/queries";
import { getSessionUserId, hasTeamPermission } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { parseSearchParams, stateIdSchema } from "@/lib/route-input";

const querySchema = z.object({
  stateId: stateIdSchema,
  search: z.string().default(""),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();

  const input = parseSearchParams(request.nextUrl.searchParams, querySchema);
  if (input.response) return input.response;
  const { stateId, search } = input.data;

  try {
    const userId = await getSessionUserId();
    if (
      !userId ||
      !(await hasTeamPermission(stateId, userId, "team.members"))
    ) {
      return unauthorizedResponse(userId);
    }

    const results = await getPersonsWithoutState({ search });

    return NextResponse.json({
      success: true,
      data: results,
      message: "Persons without state retrieved successfully",
    });
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      { success: false, message: "Error retrieving persons" },
      { status: 500 },
    );
  }
}
