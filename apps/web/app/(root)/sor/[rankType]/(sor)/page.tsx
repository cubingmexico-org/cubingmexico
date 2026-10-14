import * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { SORTable } from "../_components/sor-table";
import { getSOR, getSORGenderCounts, getSORStateCounts } from "../_lib/queries";
import { SearchParams } from "@/types";
import { getValidFilters } from "@/lib/data-table";
import { searchParamsCache } from "../_lib/validations";
import { RankTypeSelector } from "../_components/rank-type-selector";
import Link from "next/link";
import type { Metadata } from "next";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";

export const metadata: Metadata = {
  title: "Sum Of Ranks | Cubing México",
  description:
    "Encuentra el ranking de los mejores cuberos de México en cada evento de la WCA. Filtra por estado, género y más.",
};

interface PageProps {
  params: Promise<{ rankType: "single" | "average" }>;
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const rankType = (await props.params).rankType;

  const search = searchParamsCache.parse(searchParams);

  const validFilters = getValidFilters(search.filters);
  const scope = eventScopeFromDeprecated(search.deprecated);

  const promises = Promise.all([
    getSOR(
      {
        ...search,
        filters: validFilters,
      },
      rankType,
    ),
    getSORStateCounts(rankType, scope),
    getSORGenderCounts(rankType, scope),
  ]);

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">
          {`Sum of Ranks (${rankType === "single" ? "Single" : "Average"})`}
        </h1>
        <p>
          Sum Of Ranks (SOR) o &quot;suma de rankings&quot;, es un método
          utilizado para calcular la habilidad de un cubero en los 17 eventos de
          la WCA. La suma de rankings se calcula sumando el{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href="/rankings/333/single"
          >
            ranking nacional
          </Link>{" "}
          obtenido por un cubero en cada evento.
        </p>
        <p>
          Se utiliza a menudo como una medida del rendimiento general o la
          consistencia en varios eventos. Una suma de rankings más baja indica
          un mejor rendimiento general, ya que significa que el cubero logró
          consistentemente rankings más altos en los eventos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <RankTypeSelector selectedRankType={rankType} />
        </div>
        <DeprecatedEventsSwitch />
      </div>
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
          <SORTable promises={promises} rankType={rankType} scope={scope} />
        </React.Suspense>
      </div>
    </>
  );
}
