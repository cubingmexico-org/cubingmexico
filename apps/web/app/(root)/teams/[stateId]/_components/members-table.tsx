"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { Member } from "../_types";
import { getColumns } from "./members-table-columns";

interface MembersTableProps {
  promises: Promise<
    [{ data: Member[]; pageCount: number }, Record<string, number>]
  >;
}

export function MembersTable({ promises }: MembersTableProps) {
  const [{ data, pageCount }, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getColumns({
        genderCounts,
      }),
    [genderCounts],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnVisibility: {
        gender: false,
      },
    },
    getRowId: (originalRow) => originalRow.wcaId,
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
