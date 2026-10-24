"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import type { CcEventOption } from "@/lib/cubing-contests";

export function CcRecordsEventSelector({
  events,
}: {
  events: CcEventOption[];
}) {
  const [{ event: selectedEvent }, setQueryState] = useQueryStates(
    { event: parseAsString.withDefault("") },
    { clearOnDefault: true, shallow: false },
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold text-sm">Eventos</span>
      <div className="flex flex-wrap gap-2">
        {events.map((event) => (
          <Button
            key={event.id}
            type="button"
            variant="outline"
            aria-label={event.name}
            aria-pressed={selectedEvent === event.id}
            className={cn(
              "h-10 min-w-10 px-2 text-muted-foreground",
              selectedEvent === event.id &&
                "bg-accent text-primary border-primary",
            )}
            onClick={() =>
              setQueryState({
                event: selectedEvent === event.id ? "" : event.id,
              })
            }
          >
            <CcEventIcon
              eventId={event.id}
              eventName={event.name}
              className="text-2xl"
            />
          </Button>
        ))}
      </div>
    </div>
  );
}
