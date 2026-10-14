"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { getSOSR, getSOSRGenderCounts } from "../_lib/queries";
import { getColumns } from "./sosr-table-columns";
import type { EventScope } from "@/lib/constants";

interface SOSRTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getSOSR>>,
      Awaited<ReturnType<typeof getSOSRGenderCounts>>,
    ]
  >;
  rankType: "single" | "average";
  scope: EventScope;
}

export function SOSRTable({ promises, rankType, scope }: SOSRTableProps) {
  const [{ data, pageCount }, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () => getColumns({ rankType, genderCounts, scope }),
    [rankType, genderCounts, scope],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "rank", desc: false }],
      columnVisibility: {
        gender: false,
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
