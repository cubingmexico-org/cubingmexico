"use client";

import Link from "next/link";
import {
  parseAsArrayOf,
  parseAsString,
  createSerializer,
  useQueryStates,
} from "nuqs";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { RankTypeSelector } from "@/components/rank-type-selector";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import type { CcEventOption } from "@/lib/cubing-contests";
import type { CcRankType } from "../../../../_lib/ranking";

const searchParams = {
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
};
const serialize = createSerializer(searchParams);

interface CcEventSelectorProps {
  events: CcEventOption[];
  selectedEventId: string;
  selectedRankType: CcRankType;
  className?: string;
}

export function CcEventSelector({
  events,
  selectedEventId,
  selectedRankType,
  className,
}: CcEventSelectorProps) {
  const [preserved] = useQueryStates(searchParams);
  const eventName = events.find((event) => event.id === selectedEventId)?.name;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h1 className="text-3xl font-bold">
        Ranking nacional no oficial de {eventName} (
        {selectedRankType === "single" ? "Single" : "Average"})
      </h1>
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">Eventos</span>
        <div className="flex flex-wrap gap-2 text-muted-foreground">
          {events.map((event) => (
            <Button
              key={event.id}
              variant="outline"
              asChild
              className={cn(
                "h-10 min-w-10 px-2 text-muted-foreground",
                selectedEventId === event.id &&
                  "bg-accent text-primary border-primary",
              )}
            >
              <Link
                href={serialize(
                  `/unofficial/rankings/${event.id}/${selectedRankType}`,
                  preserved,
                )}
                aria-label={event.name}
              >
                <CcEventIcon
                  eventId={event.id}
                  eventName={event.name}
                  className="text-2xl"
                />
              </Link>
            </Button>
          ))}
        </div>
      </div>
      <RankTypeSelector
        className="sm:max-w-md"
        selectedRankType={selectedRankType}
        hrefSingle={serialize(
          `/unofficial/rankings/${selectedEventId}/single`,
          preserved,
        )}
        hrefAverage={serialize(
          `/unofficial/rankings/${selectedEventId}/average`,
          preserved,
        )}
      />
    </div>
  );
}
