import * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { getValidFilters } from "@/lib/data-table";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import type { GroupKind } from "@workspace/db/schema";
import type { SearchParams } from "@/types";
import {
  getGroupInfo,
  getGroupSOR,
  getGroupSORGenderCounts,
} from "../_lib/queries";
import { redirectIfSponsorHasNoRoster } from "../_lib/roster";
import { groupSorSearchParamsCache } from "../_lib/sor-validations";
import { GroupSORRankTypeSelector } from "./group-sor-rank-type-selector";
import { GroupSORTable } from "./group-sor-table";

export async function GroupSOR({
  groupId,
  kind,
  rankType,
  searchParams,
}: {
  groupId: string;
  kind: GroupKind;
  rankType: "single" | "average";
  searchParams: SearchParams;
}) {
  await redirectIfSponsorHasNoRoster(groupId, kind);

  const info = await getGroupInfo(groupId);
  if (!info || info.kind !== kind) {
    return null;
  }

  const search = groupSorSearchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);
  const scope = eventScopeFromDeprecated(search.deprecated);

  const promises = Promise.all([
    getGroupSOR(
      {
        ...search,
        filters: validFilters,
      },
      groupId,
      rankType,
    ),
    getGroupSORGenderCounts(groupId, rankType, scope),
  ]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Sum of Ranks ({rankType === "single" ? "Single" : "Average"})
          </h2>
          <p className="text-sm text-muted-foreground">
            Suma de rankings internos del grupo en cada evento.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GroupSORRankTypeSelector
            groupId={groupId}
            kind={kind}
            selectedRankType={rankType}
          />
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
          <GroupSORTable
            promises={promises}
            rankType={rankType}
            scope={scope}
          />
        </React.Suspense>
      </div>
    </>
  );
}
