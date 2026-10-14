"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type {
  getSOR,
  getSORGenderCounts,
  getSORStateCounts,
} from "../_lib/queries";
import { getColumns } from "./sor-table-columns";
import type { EventScope } from "@/lib/constants";

interface SORTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getSOR>>,
      Awaited<ReturnType<typeof getSORStateCounts>>,
      Awaited<ReturnType<typeof getSORGenderCounts>>,
    ]
  >;
  rankType: "single" | "average";
  scope: EventScope;
}

export function SORTable({ promises, rankType, scope }: SORTableProps) {
  const [{ data, pageCount }, stateCounts, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getColumns({
        rankType,
        stateCounts,
        genderCounts,
        scope,
      }),
    [rankType, stateCounts, genderCounts, scope],
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
