import { connection, NextResponse } from "next/server";
import * as z from "zod";
import { getSessionUserId } from "@/lib/team-auth";
import { unauthorizedResponse } from "@/lib/api-auth";
import { reportError } from "@/lib/report-error";
import { parseSearchParams } from "@/lib/route-input";
import { isSuperadmin } from "@/lib/superadmin";
import { searchPersons } from "@/app/(root)/admin/_lib/queries";

const querySchema = z.object({
  search: z.string().max(100).default(""),
});

export async function GET(request: Request): Promise<NextResponse> {
  await connection();

  const userId = await getSessionUserId();
  if (!userId || !isSuperadmin(userId)) {
    return unauthorizedResponse(userId);
  }

  const input = parseSearchParams(
    new URL(request.url).searchParams,
    querySchema,
  );
  if (input.response) return input.response;

  try {
    const results = await searchPersons(input.data.search);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      { success: false, message: "Error searching persons" },
      { status: 500 },
    );
  }
}
