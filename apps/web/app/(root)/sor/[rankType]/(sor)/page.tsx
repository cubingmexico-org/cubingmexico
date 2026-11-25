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
import { PageHeading } from "@/components/page-heading";
import { eventScopeFromDeprecated } from "@/lib/official-events";

export const metadata: Metadata = {
  title: "Sum of Ranks | Cubing México",
  description:
    "Sum of Ranks nacional: suma de tus posiciones en cada evento. Más bajo es mejor.",
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
        <PageHeading>
          {`Sum of Ranks (${rankType === "single" ? "Single" : "Average"})`}
        </PageHeading>
        <p>
          Sum of Ranks (SOR) suma tu{" "}
          <Link
            className="underline text-link hover:text-link/80"
            href="/rankings/333/single"
          >
            ranking nacional
          </Link>{" "}
          en cada evento de la WCA. Un total más bajo suele indicar mejor
          rendimiento general: estuviste más arriba en más eventos.
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
