import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { getCompetitionLogo, getWcaCompetitionData } from "../../_lib/queries";
import { ResultsHeader } from "../_components/results-header";
import {
  getCompetitionCcEvents,
  getCompetitionCcResults,
} from "./_lib/queries";
import { roundTypeLabel } from "@/lib/utils";
import type { CcEventOption, CcResultRow } from "@/lib/cubing-contests";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcResultsTable } from "@/components/cubing-contests/cc-results-table";

function groupByRound(rows: CcResultRow[]) {
  const rounds = new Map<string, CcResultRow[]>();
  for (const row of rows) {
    const key = `${row.roundNumber}-${row.roundTypeId ?? ""}`;
    const list = rounds.get(key) ?? [];
    list.push(row);
    rounds.set(key, list);
  }
  return Array.from(rounds.entries()).map(([key, roundRows]) => ({
    key,
    label: roundTypeLabel(roundRows[0]?.roundTypeId) || "Ronda",
    rows: roundRows,
  }));
}

async function UnofficialResultsCached({
  competitionId,
  competitionName,
  competitionCity,
  defaultEventId,
  logo,
  events,
  selectedEvent,
}: {
  competitionId: string;
  competitionName: string;
  competitionCity: string;
  defaultEventId: string;
  logo: string | null;
  events: CcEventOption[];
  selectedEvent: CcEventOption;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(
    "cc-results",
    `cc-competition-page-${competitionId}-${selectedEvent.id}`,
  );

  const rows = await getCompetitionCcResults(competitionId, selectedEvent.id);
  const rounds = groupByRound(rows);

  return (
    <main className="grow container mx-auto px-4 py-8 space-y-6">
      <ResultsHeader
        competitionId={competitionId}
        competitionName={competitionName}
        competitionCity={competitionCity}
        defaultEventId={defaultEventId}
        logo={logo}
        hasUnofficial
      />
      <Card>
        <CardHeader>
          <CardTitle>Eventos no oficiales</CardTitle>
          <CardDescription>
            Eventos no oficiales que se realizaron en esta competencia WCA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            {events.map((event) => (
              <Link
                key={event.id}
                prefetch={false}
                href={`/competitions/${competitionId}/results/unofficial?event=${event.id}`}
                className={cn(
                  "text-2xl hover:text-primary/50 transition-colors",
                  selectedEvent.id === event.id && "text-primary",
                )}
              >
                <CcEventIcon eventId={event.id} eventName={event.name} />
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <CcEventIcon
                eventId={selectedEvent.id}
                eventName={selectedEvent.name}
                className="text-xl"
              />
              {selectedEvent.name}
            </h3>
            {rounds.map((round) => (
              <div key={round.key} className="space-y-2">
                <h4 className="text-sm font-medium">{round.label}</h4>
                <CcResultsTable rows={round.rows} mode="competitors" />
              </div>
            ))}
          </div>
          <CcAttribution />
        </CardContent>
      </Card>
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

  const [competitionData, logo, events] = await Promise.all([
    getWcaCompetitionData(id),
    getCompetitionLogo(id),
    getCompetitionCcEvents(id),
  ]);
  if (!competitionData || events.length === 0) {
    notFound();
  }

  const searchEventId = Array.isArray(searchParamsValue.event)
    ? searchParamsValue.event[0]
    : searchParamsValue.event;
  const selectedEvent =
    events.find((event) => event.id === searchEventId) ?? events[0]!;

  return (
    <UnofficialResultsCached
      competitionId={competitionData.id}
      competitionName={competitionData.name}
      competitionCity={competitionData.city}
      defaultEventId={
        competitionData.main_event_id ?? competitionData.event_ids[0] ?? ""
      }
      logo={logo}
      events={events}
      selectedEvent={selectedEvent}
    />
  );
}
