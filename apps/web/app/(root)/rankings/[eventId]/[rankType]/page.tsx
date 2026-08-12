import * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Metadata } from "next";
import { EventSelector } from "./_components/event-selector";
import { getEvents } from "@/db/queries";
import type { EventId } from "@/types/wca";
import type { SearchParams } from "@/types";
import {
  RankSinglesLoader,
  RankAveragesLoader,
} from "./_components/rankings-loader";

type Params = { eventId: EventId; rankType: "single" | "average" };

type Props = {
  params: Promise<Params>;
};

export async function generateStaticParams() {
  const events = await getEvents();
  return events.flatMap((event) => [
    { eventId: event.id, rankType: "single" },
    { eventId: event.id, rankType: "average" },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId, rankType } = await params;
  const events = await getEvents();
  const eventName =
    events.find((event) => event.id === eventId)?.name ?? eventId;

  if (rankType === "single") {
    return {
      title: `${eventName} · Ranking de Singles | Cubing México`,
      description:
        "Encuentra el ranking de los mejores cuberos de México en cada evento de la WCA. Filtra por estado, género y más.",
    };
  }

  return {
    title: `${eventName} · Ranking de Averages | Cubing México`,
    description:
      "Encuentra el ranking de los mejores cuberos de México en cada evento de la WCA. Filtra por estado, género y más.",
  };
}

interface PageProps {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { eventId, rankType } = await params;

  const events = await getEvents();

  return (
    <>
      <EventSelector
        className="mb-6"
        events={events}
        selectedEventId={eventId}
        selectedRankType={rankType}
      />
      <div className="grid gap-6">
        <React.Suspense
          fallback={
            <DataTableSkeleton
              columnCount={7}
              filterCount={2}
              cellWidths={[
                "10rem",
                "30rem",
                "10rem",
                "10rem",
                "6rem",
                "6rem",
                "6rem",
              ]}
              shrinkZero
            />
          }
        >
          {rankType === "single" ? (
            <RankSinglesLoader searchParams={searchParams} eventId={eventId} />
          ) : (
            <RankAveragesLoader searchParams={searchParams} eventId={eventId} />
          )}
        </React.Suspense>
      </div>
    </>
  );
}
