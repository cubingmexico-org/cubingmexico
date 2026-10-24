import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import type { SearchParams } from "@/types";
import type { CcEventFormat } from "@/lib/cubing-contests";
import {
  getCcRankingEvents,
  getCcRankingPage,
  getCcRankingStateCounts,
} from "../../../_lib/queries";
import type { CcRankType } from "../../../_lib/ranking";
import { searchParamsCache } from "./_lib/validations";
import { CcEventSelector } from "./_components/event-selector";
import { CcRankingTable } from "./_components/ranking-table";

type Params = { eventId: string; rankType: string };

function isRankType(value: string): value is CcRankType {
  return value === "single" || value === "average";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { eventId, rankType } = await params;
  const events = await getCcRankingEvents();
  const eventName =
    events.find((event) => event.id === eventId)?.name ?? eventId;
  const label = rankType === "average" ? "Averages" : "Singles";

  return {
    title: `${eventName} · Ranking no oficial de ${label} | Cubing México`,
    description:
      "Ranking de cuberos mexicanos en eventos no oficiales realizados en competencias WCA, con resultados de Cubing Contests.",
  };
}

async function RankingLoader({
  searchParams,
  eventId,
  rankType,
  eventFormat,
}: {
  searchParams: Promise<SearchParams>;
  eventId: string;
  rankType: CcRankType;
  eventFormat: CcEventFormat;
}) {
  const search = searchParamsCache.parse(await searchParams);
  const promises = Promise.all([
    getCcRankingPage(search, eventId, rankType),
    getCcRankingStateCounts(eventId, rankType),
  ]);
  return (
    <CcRankingTable
      promises={promises}
      eventId={eventId}
      eventFormat={eventFormat}
      rankType={rankType}
    />
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { eventId, rankType } = await params;
  const events = await getCcRankingEvents();
  const selectedEvent = events.find((event) => event.id === eventId);
  if (!selectedEvent || !isRankType(rankType)) {
    notFound();
  }

  return (
    <>
      <CcEventSelector
        className="mb-6"
        events={events}
        selectedEventId={eventId}
        selectedRankType={rankType}
      />
      <div className="grid gap-6">
        <React.Suspense
          fallback={
            <DataTableSkeleton
              columnCount={5}
              filterCount={2}
              cellWidths={["4rem", "20rem", "8rem", "16rem", "6rem"]}
              shrinkZero
            />
          }
        >
          <RankingLoader
            searchParams={searchParams}
            eventId={eventId}
            rankType={rankType}
            eventFormat={selectedEvent.format}
          />
        </React.Suspense>
        <CcAttribution />
      </div>
    </>
  );
}
