import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { searchSite } from "@/db/site-search";
import {
  SITE_SEARCH_MAX_LENGTH,
  SITE_SEARCH_MIN_LENGTH,
} from "@/lib/site-search-types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (q.length < SITE_SEARCH_MIN_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Query must be at least ${SITE_SEARCH_MIN_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    if (q.length > SITE_SEARCH_MAX_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Query must be at most ${SITE_SEARCH_MAX_LENGTH} characters`,
        },
        { status: 400 },
      );
    }

    const data = await searchSite(q);

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
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Error searching" },
      { status: 500 },
    );
  }
}
