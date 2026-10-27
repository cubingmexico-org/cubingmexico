"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type {
  getCompetitions,
  getCompetitionsStateCounts,
  getCompetitionsStatusCounts,
} from "../_lib/queries";
import { getColumns } from "./competitions-table-columns";

interface CompetitionsTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getCompetitions>>,
      Awaited<ReturnType<typeof getCompetitionsStateCounts>>,
      Awaited<ReturnType<typeof getCompetitionsStatusCounts>>,
    ]
  >;
}

export function CompetitionsTable({ promises }: CompetitionsTableProps) {
  const [{ data, pageCount }, stateCounts, statusCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getColumns({
        stateCounts,
        statusCounts,
      }),
    [stateCounts, statusCounts],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "startDate", desc: true }],
      columnVisibility: {
        status: false,
      },
    },
    getRowId: (originalRow) => originalRow.id,
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
