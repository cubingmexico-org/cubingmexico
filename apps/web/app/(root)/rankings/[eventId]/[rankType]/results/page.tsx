import * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import {
  RankAveragesTable,
  RankSinglesTable,
} from "./_components/rankings-table";
import {
  getRankSinglesGenderCounts,
  getRankSingles,
  getRankSinglesStateCounts,
  getRankAverages,
  getRankAveragesStateCounts,
  getRankAveragesGenderCounts,
} from "./_lib/queries";
import { SearchParams } from "@/types";
import { getValidFilters } from "@/lib/data-table";
import {
  searchAverageParamsCache,
  searchSingleParamsCache,
} from "./_lib/validations";
import { Metadata } from "next";
import { EventSelector } from "../_components/event-selector";
import { getEvents } from "@/db/queries";
import type { EventId } from "@/types/wca";

type Params = {
  rankType: "single" | "average";
  eventId: EventId;
};

type Props = {
  params: Promise<Params>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rankType } = await params;
  // const eventId = (await params).eventId;

  // const team = await getTeam(rankType);

  if (rankType === "single") {
    return {
      title: `Ranking de resultados de Singles | Cubing México`,
      description:
        "Encuentra el ranking de los mejores resultados de México en cada evento de la WCA. Filtra por estado, género y más.",
    };
  }

  return {
    title: `Ranking de resultados de Averages | Cubing México`,
    description:
      "Encuentra el ranking de los mejores resultados de México en cada evento de la WCA. Filtra por estado, género y más.",
  };
}

interface PageProps {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const { eventId, rankType } = await props.params;

  const searchSingle = searchSingleParamsCache.parse(searchParams);
  const searchAverage = searchAverageParamsCache.parse(searchParams);

  const validSingleFilters = getValidFilters(searchSingle.filters);
  const validAverageFilters = getValidFilters(searchAverage.filters);

  const singlePromises = Promise.all([
    getRankSingles(
      {
        ...searchSingle,
        filters: validSingleFilters,
      },
      eventId,
    ),
    getRankSinglesStateCounts(eventId, searchSingle.asOf),
    getRankSinglesGenderCounts(eventId, searchSingle.asOf),
  ]);

  const averagePromises = Promise.all([
    getRankAverages(
      {
        ...searchAverage,
        filters: validAverageFilters,
      },
      eventId,
    ),
    getRankAveragesStateCounts(eventId, searchAverage.asOf),
    getRankAveragesGenderCounts(eventId, searchAverage.asOf),
  ]);

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
            <RankSinglesTable promises={singlePromises} />
          ) : (
            <RankAveragesTable promises={averagePromises} />
          )}
        </React.Suspense>
      </div>
    </>
  );
}
