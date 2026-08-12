import { notFound } from "next/navigation";
import { getWcaCompetitionData } from "../../_lib/queries";
import { getCompetitionPodiumGroups } from "./_lib/queries";
import { ResultsHeader } from "../_components/results-header";
import { ResultsPodiumsView } from "../_components/results-views";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  const [competitionData, podiumGroups] = await Promise.all([
    getWcaCompetitionData(id),
    getCompetitionPodiumGroups(id),
  ]);

  if (!competitionData) {
    notFound();
  }

  const defaultEventId =
    competitionData.main_event_id ?? competitionData.event_ids[0] ?? "";

  return (
    <main className="grow container mx-auto px-4 py-8 space-y-6">
      <ResultsHeader
        competitionId={competitionData.id}
        competitionName={competitionData.name}
        competitionCity={competitionData.city}
        defaultEventId={defaultEventId}
      />
      <ResultsPodiumsView podiumGroups={podiumGroups} />
    </main>
  );
}
