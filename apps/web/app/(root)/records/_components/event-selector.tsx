"use client";

import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { parseAsString, useQueryStates } from "nuqs";

interface EventSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  events: {
    id: string;
    name: string;
  }[];
  className?: string;
}

export function EventSelector({
  events,
  className,
  ...props
}: EventSelectorProps) {
  const [queryState, setQueryState] = useQueryStates(
    {
      event: parseAsString.withDefault(""),
    },
    {
      clearOnDefault: true,
      shallow: false,
    },
  );

  const selectedEvent = queryState.event;

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="font-semibold text-sm">Eventos</span>
      <div className="flex flex-wrap gap-2">
        {events.map((event) => (
          <Button
            key={event.id}
            type="button"
            variant="outline"
            size="icon"
            aria-label={event.name}
            aria-pressed={selectedEvent === event.id}
            className={cn(
              "size-10 text-muted-foreground",
              selectedEvent === event.id &&
                "bg-accent text-primary border-primary",
            )}
            onClick={() =>
              setQueryState({
                event: selectedEvent === event.id ? "" : event.id,
              })
            }
          >
            <span className={`cubing-icon event-${event.id} text-2xl`} />
          </Button>
        ))}
      </div>
    </div>
  );
}
