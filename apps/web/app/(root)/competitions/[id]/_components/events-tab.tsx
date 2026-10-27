import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { eventNames } from "@/lib/constants";
import type { CcEventOption } from "@/lib/cubing-contests";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import type { Competition } from "@/types/wca";

export function EventsTab({
  competitionId,
  competition,
  ccEvents,
}: {
  competitionId: string;
  competition: Competition;
  ccEvents: CcEventOption[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos de la competencia</CardTitle>
        <CardDescription>
          Esta competencia cuenta con {competition.event_ids.length} evento
          {competition.event_ids.length !== 1 ? "s" : ""} oficiales de la WCA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {competition.event_ids.map((eventId) => (
            <div
              key={eventId}
              className={cn(
                "flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors",
                competition.main_event_id === eventId
                  ? "border-primary bg-primary/10"
                  : "border-transparent",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <span className={`cubing-icon event-${eventId} text-xl`} />
              </div>
              <div>
                <p className="font-medium">{eventNames[eventId] || eventId}</p>
              </div>
            </div>
          ))}
        </div>
        {ccEvents.length > 0 && (
          <div className="mt-6 space-y-3">
            <div>
              <h3 className="font-semibold">Eventos no oficiales</h3>
              <p className="text-sm text-muted-foreground">
                Resultados de Cubing Contests para los eventos no oficiales de
                esta competencia.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ccEvents.map((event) => (
                <Link
                  key={event.id}
                  prefetch={false}
                  href={`/competitions/${competitionId}/results/unofficial?event=${event.id}`}
                  className="flex items-center gap-3 p-4 border border-transparent rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CcEventIcon
                      eventId={event.id}
                      eventName={event.name}
                      className="text-xl"
                    />
                  </div>
                  <p className="font-medium">{event.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
