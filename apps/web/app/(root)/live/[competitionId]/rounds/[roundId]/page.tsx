import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { enrichLiveRoundDetails } from "@/lib/live/enrich";
import { liveRoundLabel } from "@/lib/live/format";
import { officialLiveUrl, usesClassicWcaLive } from "@/lib/live/urls";
import {
  fetchLiveCompetitionMeta,
  fetchLiveRoundDetails,
} from "@/lib/live/wca";
import { WcaLiveUnsupported } from "../../../../_components/wca-live-unsupported";
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
  try {
    meta = await fetchLiveCompetitionMeta(competitionId);
  } catch {
    notFound();
  }

  if (!meta) {
    notFound();
  }

  const officialUrl = officialLiveUrl(competitionId, meta.scoretakingSoftware);

  if (usesClassicWcaLive(meta.scoretakingSoftware)) {
    return (
      <main className="grow container mx-auto px-4 py-8">
        <WcaLiveUnsupported
          competition={meta}
          officialLiveUrl={officialUrl}
        />
      </main>
    );
  }

  let round;
  try {
    round = await fetchLiveRoundDetails(competitionId, roundId);
  } catch {
    notFound();
  }

  if (!round) {
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
          officialLiveUrl: officialUrl,
        }}
      />
    </main>
  );
}
