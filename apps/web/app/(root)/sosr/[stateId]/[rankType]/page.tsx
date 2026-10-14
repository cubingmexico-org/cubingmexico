import * as React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { getStates } from "@/db/queries";
import { getSOSR, getSOSRGenderCounts, getSOSRState } from "./_lib/queries";
import { RankTypeSelector } from "./_components/rank-type-selector";
import { SOSRTable } from "./_components/sosr-table";
import { StateSelector } from "../_components/state-selector";
import { getValidFilters } from "@/lib/data-table";
import { searchParamsCache } from "./_lib/validations";
import { SearchParams } from "@/types";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";

type Props = {
  params: Promise<{ stateId: string; rankType: "single" | "average" }>;
};

export async function generateStaticParams() {
  const states = await getStates();
  return states.flatMap((state) => [
    { stateId: state.id, rankType: "single" },
    { stateId: state.id, rankType: "average" },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stateId, rankType } = await params;
  const states = await getStates();
  const stateName = states.find((state) => state.id === stateId)?.name;

  return {
    title: `Sum Of State Ranks (${rankType === "single" ? "Single" : "Average"}) | ${stateName ?? "Cubing México"}`,
    description:
      "Encuentra la suma de rankings estatales de los mejores cuberos de México en cada evento de la WCA.",
  };
}

interface PageProps {
  params: Promise<{ rankType: "single" | "average"; stateId: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const { stateId, rankType } = await props.params;

  const states = await getStates();
  const state = states.find((entry) => entry.id === stateId);

  if (!state || (rankType !== "single" && rankType !== "average")) {
    redirect("/sosr/MEX/single");
  }

  const stateData = await getSOSRState(stateId);

  const search = searchParamsCache.parse(searchParams);

  const validFilters = getValidFilters(search.filters);

  const promises = Promise.all([
    getSOSR(
      {
        ...search,
        filters: validFilters,
      },
      stateId,
      rankType,
    ),
    getSOSRGenderCounts(
      stateId,
      rankType,
      eventScopeFromDeprecated(search.deprecated),
    ),
  ]);

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          {`Sum of State Ranks (${rankType === "single" ? "Single" : "Average"}) de ${stateData?.name ?? state.name}`}
        </h1>
        <p>
          Sum Of State Ranks (SOSR) es la versión estatal de SOR. En lugar de
          sumar el ranking nacional, suma el ranking estatal obtenido por un
          cubero en cada evento.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-sm">Estado</span>
            <StateSelector
              states={states}
              stateId={stateId}
              stateName={stateData?.name ?? state.name}
              rankType={rankType}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RankTypeSelector stateId={stateId} selectedRankType={rankType} />
        </div>
        <DeprecatedEventsSwitch />
      </div>
      <div className="grid gap-6">
        <React.Suspense
          fallback={
            <DataTableSkeleton
              columnCount={7}
              filterCount={1}
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
          <SOSRTable
            promises={promises}
            rankType={rankType}
            scope={eventScopeFromDeprecated(search.deprecated)}
          />
        </React.Suspense>
      </div>
    </>
  );
}
