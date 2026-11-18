import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { enrichLiveRoundDetails } from "@/lib/live/enrich";
import { liveRoundLabel } from "@/lib/live/format";
import { officialLiveUrl } from "@/lib/live/urls";
import {
  fetchLiveCompetitionMeta,
  fetchLiveRoundDetails,
} from "@/lib/live/wca";
import { LiveResultsView } from "./_components/live-results-view";

type Props = {
  params: Promise<{ competitionId: string; roundId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitionId, roundId } = await params;
  try {
    const meta = await fetchLiveCompetitionMeta(competitionId);
    const label = liveRoundLabel(roundId);
    return {
      title: meta
        ? `${label} · ${meta.name} | Cubing México`
        : `${label} | Cubing México`,
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: "En vivo | Cubing México",
      robots: { index: false, follow: false },
    };
  }
}

export default async function LiveRoundPage({ params }: Props) {
  await connection();
  const { competitionId, roundId } = await params;

  let meta;
  let round;
  try {
    [meta, round] = await Promise.all([
      fetchLiveCompetitionMeta(competitionId),
      fetchLiveRoundDetails(competitionId, roundId),
    ]);
  } catch {
    notFound();
  }

  if (!meta || !round) {
    notFound();
  }

  const enriched = await enrichLiveRoundDetails(round, {
    competitionName: meta.name,
    scoretakingSoftware: meta.scoretakingSoftware,
  });

  return (
    <main className="grow container mx-auto px-4 py-8">
      <LiveResultsView
        competitionId={competitionId}
        roundId={roundId}
        initial={{
          ...enriched,
          officialLiveUrl: officialLiveUrl(
            competitionId,
            meta.scoretakingSoftware,
          ),
        }}
      />
    </main>
  );
}
