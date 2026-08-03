import { notFound } from "next/navigation";
import { getCompetitions } from "@/db/queries";
import { getWcaCompetitionData } from "../../_lib/queries";
import { getCompetitionResultsForEvent } from "./_lib/queries";
import { ResultsHeader } from "../_components/results-header";
import { ResultsAllView } from "../_components/results-views";
import { cacheLife, cacheTag } from "next/cache";

export async function generateStaticParams() {
  const competitions = await getCompetitions();
  return competitions.map((competition) => ({ id: competition.id }));
}

async function ResultsAllCached({
  competitionId,
  eventId,
  competitionName,
  competitionCity,
  eventIds,
  mainEventId,
}: {
  competitionId: string;
  eventId: string;
  competitionName: string;
  competitionCity: string;
  eventIds: string[];
  mainEventId: string | null;
}) {
  "use cache";
  cacheLife("weeks");
  cacheTag(`competition-results-all-page-${competitionId}-${eventId}`);

  const eventResults = await getCompetitionResultsForEvent(
    competitionId,
    eventId,
  );
  const groupedResultsByEvent = eventResults ? [eventResults] : [];

  return (
    <main className="grow container mx-auto px-4 py-8 space-y-6">
      <ResultsHeader
        competitionId={competitionId}
        competitionName={competitionName}
        competitionCity={competitionCity}
        defaultEventId={eventId}
      />
      <ResultsAllView
        competitionId={competitionId}
        competitionData={{
          event_ids: eventIds,
          main_event_id: mainEventId,
        }}
        groupedResultsByEvent={groupedResultsByEvent}
        selectedEventId={eventId}
      />
    </main>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ event?: string | string[] }>;
}) {
  const [{ id }, searchParamsValue] = await Promise.all([params, searchParams]);

  const competitionData = await getWcaCompetitionData(id);
  if (!competitionData) {
    notFound();
  }

  const defaultEventId =
    competitionData.main_event_id ?? competitionData.event_ids[0] ?? "";
  const searchEventId = Array.isArray(searchParamsValue.event)
    ? searchParamsValue.event[0]
    : searchParamsValue.event;

  const selectedEventId =
    competitionData.event_ids.find((eventId) => eventId === searchEventId) ??
    defaultEventId;

  return (
    <ResultsAllCached
      competitionId={competitionData.id}
      eventId={selectedEventId}
      competitionName={competitionData.name}
      competitionCity={competitionData.city}
      eventIds={competitionData.event_ids}
      mainEventId={competitionData.main_event_id}
    />
  );
}
