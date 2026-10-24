"use client";

import * as React from "react";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { CcEventFormat } from "@/lib/cubing-contests";
import type { CcRankType, CcRankingRow } from "../../../../_lib/ranking";
import { getColumns } from "./ranking-table-columns";

const searchParams = {
  state: parseAsArrayOf(parseAsString).withDefault([]),
};

interface CcRankingTableProps {
  promises: Promise<
    [{ data: CcRankingRow[]; pageCount: number }, Record<string, number>]
  >;
  eventId: string;
  eventFormat: CcEventFormat;
  rankType: CcRankType;
}

export function CcRankingTable({
  promises,
  eventId,
  eventFormat,
  rankType,
}: CcRankingTableProps) {
  const [{ data, pageCount }, stateCounts] = React.use(promises);

  const columns = React.useMemo(
    () => getColumns({ stateCounts, eventId, eventFormat, rankType }),
    [stateCounts, eventId, eventFormat, rankType],
  );

  const [{ state }] = useQueryStates(searchParams);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "countryRank", desc: false }],
      columnVisibility: {
        state: false,
        stateRank: state.length > 0,
      },
    },
    getRowId: (originalRow) => originalRow.key,
    shallow: false,
    clearOnDefault: true,
    enableRowSelection: false,
  });

  React.useEffect(() => {
    table.setColumnVisibility((prev) => ({
      ...prev,
      stateRank: state.length > 0,
    }));
  }, [state, table]);

  return (
    <DataTable table={table}>
      <DataTableToolbar table={table} />
    </DataTable>
  );
}
