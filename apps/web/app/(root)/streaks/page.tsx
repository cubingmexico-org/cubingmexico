import * as React from "react";
import { SearchParams } from "@/types";
import { searchParamsCache } from "./_lib/validations";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { StreakTable } from "./_components/streak-table";
import {
  getStreakRanks,
  getStreakRanksGenderCounts,
  getStreakRanksStateCounts,
} from "./_lib/queries";
import { getValidFilters } from "@/lib/data-table";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const validFilters = getValidFilters(search.filters);
  const scope = eventScopeFromDeprecated(search.deprecated);

  const promises = Promise.all([
    getStreakRanks({
      ...search,
      filters: validFilters,
    }),
    getStreakRanksStateCounts(scope),
    getStreakRanksGenderCounts(scope),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold">Rachas de Récords Personales</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ranking de rachas de competencias consecutivas con récords personales.
          Se cuenta una racha como el número de competencias seguidas donde un
          speedcuber obtuvo al menos un récord personal (single o promedio) en
          cualquier evento.
        </p>
      </div>
      <DeprecatedEventsSwitch />
      <React.Suspense
        fallback={
          <DataTableSkeleton
            columnCount={6}
            filterCount={2}
            cellWidths={["10rem", "30rem", "10rem", "10rem", "10rem", "10rem"]}
            shrinkZero
          />
        }
      >
        <StreakTable promises={promises} />
      </React.Suspense>
    </div>
  );
}
