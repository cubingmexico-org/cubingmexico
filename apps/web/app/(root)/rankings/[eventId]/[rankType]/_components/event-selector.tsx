"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import * as React from "react";
import { RankTypeSelector } from "./rank-type-selector";
import { person } from "@workspace/db/schema";
import {
  parseAsString,
  parseAsArrayOf,
  createSerializer,
  useQueryStates,
  parseAsStringEnum,
} from "nuqs";
import { ResultTypeSelector } from "./result-type-selector";
import { usePathname } from "next/navigation";
import type { EventId } from "@/types/wca";
import { AsOfDatePicker } from "@/components/as-of-date-picker";

const searchParams = {
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  asOf: parseAsString.withDefault(""),
  show: parseAsArrayOf(parseAsStringEnum(["results"])).withDefault([]),
};
const serialize = createSerializer(searchParams);

interface EventSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  events: {
    id: string;
    name: string;
  }[];
  selectedEventId: EventId;
  selectedRankType: "single" | "average";
  className?: string;
}

export function EventSelector({
  events,
  selectedEventId,
  selectedRankType,
  className,
  ...props
}: EventSelectorProps) {
  const eventName = events.find((event) => event.id === selectedEventId)?.name;

  const [{ name, state, gender, asOf }] = useQueryStates(searchParams);

  const pathname = usePathname();

  const preserved = { name, state, gender, asOf };

  const hrefSingle = serialize(
    pathname.includes("results")
      ? `/rankings/${selectedEventId}/single/results`
      : `/rankings/${selectedEventId}/single`,
    preserved,
  );
  const hrefAverage = serialize(
    pathname.includes("results")
      ? `/rankings/${selectedEventId}/average/results`
      : `/rankings/${selectedEventId}/average`,
    preserved,
  );
  const hrefPersons = serialize(
    `/rankings/${selectedEventId}/${selectedRankType}`,
    preserved,
  );
  const hrefResults = serialize(
    `/rankings/${selectedEventId}/${selectedRankType}/results`,
    preserved,
  );

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <h1 className="text-3xl font-bold">
        Ranking nacional oficial de {eventName} (
        {selectedRankType === "single" ? "Single" : "Average"})
      </h1>
      <div className="flex flex-col gap-2">
        <span className="font-semibold text-sm">Eventos</span>
        <div className="flex flex-wrap gap-2 text-muted-foreground">
          {events.map((event) => {
            const href = serialize(
              pathname.includes("results")
                ? `/rankings/${event.id}/${selectedRankType}/results`
                : `/rankings/${event.id}/${selectedRankType}`,
              preserved,
            );

            return (
              <Button
                key={event.id}
                variant="outline"
                size="icon"
                asChild
                className={cn(
                  "size-10 text-muted-foreground",
                  selectedEventId === event.id &&
                    "bg-accent text-primary border-primary",
                )}
              >
                <Link href={href} aria-label={event.name}>
                  <span className={`cubing-icon event-${event.id} text-2xl`} />
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <RankTypeSelector
          hrefSingle={hrefSingle}
          hrefAverage={hrefAverage}
          selectedEventId={selectedEventId}
          selectedRankType={selectedRankType}
        />
        <ResultTypeSelector
          hrefResults={hrefResults}
          hrefPersons={hrefPersons}
        />
      </div>
      <AsOfDatePicker className="sm:max-w-xs" />
    </div>
  );
}
