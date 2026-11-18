import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  fetchLiveCompetitionMeta,
  fetchLiveRounds,
} from "@/lib/live/wca";
import { officialLiveUrl } from "@/lib/live/urls";
import { LiveCompetitionView } from "./_components/live-competition-view";

type Props = {
  params: Promise<{ competitionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitionId } = await params;
  try {
    const meta = await fetchLiveCompetitionMeta(competitionId);
    return {
      title: meta
        ? `${meta.name} · En vivo | Cubing México`
        : "Competencia no encontrada | Cubing México",
      description: meta
        ? `Resultados en vivo de ${meta.name}`
        : "La competencia no existe o no se encontró.",
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: "En vivo | Cubing México",
      robots: { index: false, follow: false },
    };
  }
}

export default async function LiveCompetitionPage({ params }: Props) {
  await connection();
  const { competitionId } = await params;

  let meta;
  let rounds;
  try {
    [meta, rounds] = await Promise.all([
      fetchLiveCompetitionMeta(competitionId),
      fetchLiveRounds(competitionId),
    ]);
  } catch {
    notFound();
  }

  if (!meta) {
    notFound();
  }

  return (
    <main className="grow container mx-auto px-4 py-8">
      <LiveCompetitionView
        competitionId={competitionId}
        initial={{
          competition: meta,
          rounds: rounds.rounds,
          officialLiveUrl: officialLiveUrl(
            competitionId,
            meta.scoretakingSoftware,
          ),
        }}
      />
    </main>
  );
}
