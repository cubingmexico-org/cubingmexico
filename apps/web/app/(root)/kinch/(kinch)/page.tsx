import * as React from "react";
import { SearchParams } from "@/types";
import { searchParamsCache } from "../_lib/validations";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { KinchTable } from "../_components/kinch-table";
import {
  getKinchRanks,
  getKinchRanksGenderCounts,
  getKinchRanksStateCounts,
} from "../_lib/queries";
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
    getKinchRanks({
      ...search,
      filters: validFilters,
    }),
    getKinchRanksStateCounts(scope),
    getKinchRanksGenderCounts(scope),
  ]);

  return (
    <>
      <DeprecatedEventsSwitch />
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
        <KinchTable promises={promises} scope={scope} />
      </React.Suspense>
    </>
  );
}
