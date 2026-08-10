import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { searchSite } from "@/db/site-search";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await connection();

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return NextResponse.json(
        { success: false, message: "Query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const data = await searchSite(q);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Error searching" },
      { status: 500 },
    );
  }
}
