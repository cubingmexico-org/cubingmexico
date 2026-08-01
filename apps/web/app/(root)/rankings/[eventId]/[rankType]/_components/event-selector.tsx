"use client";

import { cn } from "@workspace/ui/lib/utils";
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

const searchParams = {
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
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

  const [{ name, state, gender }] = useQueryStates(searchParams);

  const pathname = usePathname();

  const hrefSingle = serialize(
    pathname.includes("results")
      ? `/rankings/${selectedEventId}/single/results`
      : `/rankings/${selectedEventId}/single`,
    {
      name,
      state,
      gender,
    },
  );
  const hrefAverage = serialize(
    pathname.includes("results")
      ? `/rankings/${selectedEventId}/average/results`
      : `/rankings/${selectedEventId}/average`,
    {
      name,
      state,
      gender,
    },
  );
  const hrefPersons = serialize(
    `/rankings/${selectedEventId}/${selectedRankType}`,
    {
      name,
      state,
      gender,
    },
  );
  const hrefResults = serialize(
    `/rankings/${selectedEventId}/${selectedRankType}/results`,
    {
      name,
      state,
      gender,
    },
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
              {
                name,
                state,
                gender,
              },
            );

            return (
              <Link
                key={event.id}
                className={cn(
                  `cubing-icon event-${event.id} text-2xl hover:text-primary/50 transition-colors`,
                  selectedEventId === event.id && "text-primary",
                )}
                href={href}
              />
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}
