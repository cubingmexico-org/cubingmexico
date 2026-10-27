import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import * as z from "zod";
import { searchSite } from "@/db/site-search";
import { reportError } from "@/lib/report-error";
import { parseSearchParams } from "@/lib/route-input";
import {
  SITE_SEARCH_MAX_LENGTH,
  SITE_SEARCH_MIN_LENGTH,
} from "@/lib/site-search-types";

const searchQuerySchema = z.object({
  q: z
    .string()
    .default("")
    .pipe(
      z
        .string()
        .trim()
        .min(SITE_SEARCH_MIN_LENGTH, {
          message: `Query must be at least ${SITE_SEARCH_MIN_LENGTH} characters`,
        })
        .max(SITE_SEARCH_MAX_LENGTH, {
          message: `Query must be at most ${SITE_SEARCH_MAX_LENGTH} characters`,
        }),
    ),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();

  const input = parseSearchParams(
    request.nextUrl.searchParams,
    searchQuerySchema,
  );
  if (input.response) return input.response;

  try {
    const data = await searchSite(input.data.q);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          // A minute of staleness is fine for search; the CDN absorbs repeated keystrokes.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      { success: false, message: "Error searching" },
      { status: 500 },
    );
  }
}
