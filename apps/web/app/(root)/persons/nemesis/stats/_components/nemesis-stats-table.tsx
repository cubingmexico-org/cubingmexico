"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type {
  getNemesisStatsGenderCounts,
  getNemesisStatsStateCounts,
  getNemesisStatsTable,
} from "../_lib/queries";
import { getColumns } from "./nemesis-stats-table-columns";

interface NemesisStatsTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getNemesisStatsTable>>,
      Awaited<ReturnType<typeof getNemesisStatsStateCounts>>,
      Awaited<ReturnType<typeof getNemesisStatsGenderCounts>>,
    ]
  >;
}

export function NemesisStatsTable({ promises }: NemesisStatsTableProps) {
  const [{ data, pageCount }, stateCounts, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () => getColumns({ stateCounts, genderCounts }),
    [stateCounts, genderCounts],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
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
