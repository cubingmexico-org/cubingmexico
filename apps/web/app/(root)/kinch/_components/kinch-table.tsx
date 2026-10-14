"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type {
  getKinchRanks,
  getKinchRanksGenderCounts,
  getKinchRanksStateCounts,
} from "../_lib/queries";
import { getColumns } from "./kinch-table-columns";
import type { EventScope } from "@/lib/constants";

interface KinchTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getKinchRanks>>,
      Awaited<ReturnType<typeof getKinchRanksStateCounts>>,
      Awaited<ReturnType<typeof getKinchRanksGenderCounts>>,
    ]
  >;
  scope: EventScope;
}

export function KinchTable({ promises, scope }: KinchTableProps) {
  const [{ data, pageCount }, stateCounts, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getColumns({
        stateCounts,
        genderCounts,
        scope,
      }),
    [stateCounts, genderCounts, scope],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "rank", desc: false }],
      columnVisibility: {
        gender: false,
        state: false,
      },
    },
    getRowId: (originalRow) => originalRow.personId,
    shallow: false,
    clearOnDefault: true,
    enableRowSelection: false,
  });

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
