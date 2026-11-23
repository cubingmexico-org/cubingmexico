"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { RankTypeSelector } from "@/components/rank-type-selector";
import { rankTypeForEvent, shouldHideRankTypeSelector } from "@/lib/selectors";
import type { EventId } from "@/types/wca";

interface GroupRankingsEventSelectorProps {
  basePath: string;
  events: { id: string; name: string }[];
  selectedEventId: string;
  selectedRankType: "single" | "average";
  className?: string;
}

export function GroupRankingsEventSelector({
  basePath,
  events,
  selectedEventId,
  selectedRankType,
  className,
}: GroupRankingsEventSelectorProps) {
  const eventName =
    events.find((event) => event.id === selectedEventId)?.name ??
    selectedEventId;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <h2 className="text-lg font-semibold">
          Rankings {selectedRankType === "single" ? "single" : "average"} ·{" "}
          {eventName}
        </h2>
        <p className="text-sm text-muted-foreground">
          Clasificación interna del grupo (# = rank dentro del grupo).
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">Eventos</span>
        <div className="flex flex-wrap gap-2 text-muted-foreground">
          {events.map((event) => {
            const rankType = rankTypeForEvent(event.id, selectedRankType);
            return (
              <Button
                key={event.id}
                variant="outline"
                size="icon"
                asChild
                className={cn(
                  "size-10 text-muted-foreground",
                  selectedEventId === event.id &&
                    "border-brand bg-brand text-white hover:bg-brand-warm hover:text-white",
                )}
              >
                <Link
                  href={`${basePath}/${event.id}/${rankType}`}
                  aria-label={event.name}
                >
                  <span className={`cubing-icon event-${event.id} text-2xl`} />
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
      <RankTypeSelector
        selectedRankType={selectedRankType}
        hrefSingle={`${basePath}/${selectedEventId}/single`}
        hrefAverage={`${basePath}/${selectedEventId}/average`}
        hidden={shouldHideRankTypeSelector(selectedEventId as EventId)}
        className="sm:max-w-xs"
      />
    </div>
  );
}
