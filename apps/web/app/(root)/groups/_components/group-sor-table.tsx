"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { getGroupSOR, getGroupSORGenderCounts } from "../_lib/queries";
import { getGroupSORColumns } from "./group-sor-table-columns";
import type { EventScope } from "@/lib/constants";

interface GroupSORTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getGroupSOR>>,
      Awaited<ReturnType<typeof getGroupSORGenderCounts>>,
    ]
  >;
  rankType: "single" | "average";
  scope: EventScope;
}

export function GroupSORTable({
  promises,
  rankType,
  scope,
}: GroupSORTableProps) {
  const [{ data, pageCount }, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () => getGroupSORColumns({ rankType, genderCounts, scope }),
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
