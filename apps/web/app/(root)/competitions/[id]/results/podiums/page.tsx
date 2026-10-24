import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { getCompetitionLogo, getWcaCompetitionData } from "../../_lib/queries";
import { getCompetitionPodiumGroups } from "./_lib/queries";
import {
  getCompetitionCcEvents,
  getCompetitionCcPodiums,
} from "../unofficial/_lib/queries";
import { ResultsHeader } from "../_components/results-header";
import { ResultsPodiumsView } from "../_components/results-views";
import type { CcEventResultsGroup } from "@/lib/cubing-contests";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcResultsTable } from "@/components/cubing-contests/cc-results-table";

function UnofficialPodiums({ groups }: { groups: CcEventResultsGroup[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podios no oficiales</CardTitle>
        <CardDescription>
          Podios de los eventos no oficiales de esta competencia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <div key={group.eventId} className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CcEventIcon
                eventId={group.eventId}
                eventName={group.eventName}
                className="text-xl"
              />
              {group.eventName}
            </h3>
            <CcResultsTable rows={group.results} mode="competitors" />
          </div>
        ))}
        <CcAttribution />
      </CardContent>
    </Card>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  const [competitionData, podiumGroups, logo, ccEvents, ccPodiums] =
    await Promise.all([
      getWcaCompetitionData(id),
      getCompetitionPodiumGroups(id),
      getCompetitionLogo(id),
      getCompetitionCcEvents(id),
      getCompetitionCcPodiums(id),
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
        logo={logo}
        hasUnofficial={ccEvents.length > 0}
      />
      <ResultsPodiumsView podiumGroups={podiumGroups} />
      {ccPodiums.length > 0 && <UnofficialPodiums groups={ccPodiums} />}
    </main>
  );
}
