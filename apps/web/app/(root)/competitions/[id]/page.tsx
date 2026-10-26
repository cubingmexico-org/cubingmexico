import { Separator } from "@workspace/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  getCompetitionMainEventResults,
  getCompetitionLogo,
  getWcaCompetitionData,
} from "./_lib/queries";
import { notFound } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { getCompetitionCcEvents } from "./results/unofficial/_lib/queries";
import { CompetitionHeader } from "./_components/competition-header";
import { CompetitionStatCards } from "./_components/competition-stat-cards";
import { CompetitionActions } from "./_components/competition-actions";
import { MainEventPodium } from "./_components/main-event-podium";
import { InfoTab } from "./_components/info-tab";
import { EventsTab } from "./_components/events-tab";
import { VenueTab } from "./_components/venue-tab";
import { TeamTab } from "./_components/team-tab";
import { QuickActions } from "./_components/quick-actions";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;

  const [competitionData, logo, ccEvents] = await Promise.all([
    getWcaCompetitionData(id),
    getCompetitionLogo(id),
    getCompetitionCcEvents(id),
  ]);

  if (!competitionData) {
    notFound();
  }

  const { hasResults, competitorCount, mainEventResults } =
    await getCompetitionMainEventResults(id, competitionData.main_event_id);

  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="mb-8">
        <CompetitionHeader competition={competitionData} logo={logo} />
        <CompetitionStatCards
          competition={competitionData}
          hasResults={hasResults}
          competitorCount={competitorCount}
        />
        <CompetitionActions competition={competitionData} />

        {hasResults && (
          <MainEventPodium
            competitionId={id}
            mainEventId={competitionData.main_event_id}
            results={mainEventResults}
          />
        )}
      </div>

      <Separator className="my-8" />

      <Tabs defaultValue="info" className="mb-8">
        <TabsList className={cn("grid w-full grid-cols-4")}>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="venue">Sede</TabsTrigger>
          <TabsTrigger value="team">Organización</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <InfoTab competition={competitionData} />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventsTab
            competitionId={id}
            competition={competitionData}
            ccEvents={ccEvents}
          />
        </TabsContent>

        <TabsContent value="venue" className="mt-6">
          <VenueTab competition={competitionData} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab competition={competitionData} />
        </TabsContent>
      </Tabs>

      <QuickActions competition={competitionData} />
    </main>
  );
}
