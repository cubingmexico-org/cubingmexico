import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { reportError } from "@/lib/report-error";
import { fetchLiveCompetitionMeta, fetchLiveRounds } from "@/lib/live/wca";
import { officialLiveUrl, usesClassicWcaLive } from "@/lib/live/urls";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
};

type RouteContext = {
  params: Promise<{ competitionId: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  await connection();

  const { competitionId } = await context.params;
  if (!competitionId || competitionId.length > 64) {
    return NextResponse.json(
      { success: false, message: "Invalid competition id" },
      { status: 400 },
    );
  }

  try {
    const meta = await fetchLiveCompetitionMeta(competitionId);

    if (!meta) {
      return NextResponse.json(
        { success: false, message: "Competition not found" },
        { status: 404 },
      );
    }

    if (usesClassicWcaLive(meta.scoretakingSoftware)) {
      return NextResponse.json(
        {
          success: false,
          code: "wca_live",
          message:
            "This competition uses classic WCA Live; Cubing México live requires ILR",
          data: {
            competition: meta,
            rounds: [],
            officialLiveUrl: officialLiveUrl(
              competitionId,
              meta.scoretakingSoftware,
            ),
          },
        },
        { status: 422, headers: CACHE_HEADERS },
      );
    }

    const rounds = await fetchLiveRounds(competitionId);

    return NextResponse.json(
      {
        success: true,
        data: {
          competition: meta,
          rounds: rounds.rounds,
          officialLiveUrl: officialLiveUrl(
            competitionId,
            meta.scoretakingSoftware,
          ),
        },
      },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    reportError(error);
    return NextResponse.json(
      { success: false, message: "Error fetching live rounds" },
      { status: 502 },
    );
  }
}
