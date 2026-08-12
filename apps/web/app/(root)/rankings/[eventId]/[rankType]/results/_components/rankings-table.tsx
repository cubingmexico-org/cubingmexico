"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type {
  getRankSinglesGenderCounts,
  getRankSingles,
  getRankSinglesStateCounts,
  getRankAverages,
  getRankAveragesStateCounts,
  getRankAveragesGenderCounts,
} from "../_lib/queries";
import { getAverageColumns, getSingleColumns } from "./rankings-table-columns";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import type { EventId } from "@/types/wca";

const searchParams = {
  state: parseAsArrayOf(parseAsString).withDefault([]),
};

interface RankSinglesTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getRankSingles>>,
      Awaited<ReturnType<typeof getRankSinglesStateCounts>>,
      Awaited<ReturnType<typeof getRankSinglesGenderCounts>>,
    ]
  >;
  eventId: EventId;
}

export function RankSinglesTable({ promises, eventId }: RankSinglesTableProps) {
  const [{ data, pageCount }, stateCounts, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getSingleColumns({
        stateCounts,
        genderCounts,
        eventId,
      }),
    [stateCounts, genderCounts, eventId],
  );

  const [{ state }] = useQueryStates(searchParams);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "best", desc: false }],
      columnVisibility: {
        gender: false,
        stateRank: state.length > 0,
      },
    },
    getRowId: (originalRow) =>
      `${originalRow.personId}-${originalRow.competitionId}-${originalRow.best}`,
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

interface RankAveragesTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getRankAverages>>,
      Awaited<ReturnType<typeof getRankAveragesStateCounts>>,
      Awaited<ReturnType<typeof getRankAveragesGenderCounts>>,
    ]
  >;
  eventId: EventId;
}

export function RankAveragesTable({
  promises,
  eventId,
}: RankAveragesTableProps) {
  const [{ data, pageCount }, stateCounts, genderCounts] = React.use(promises);

  const columns = React.useMemo(
    () =>
      getAverageColumns({
        stateCounts,
        genderCounts,
        eventId,
      }),
    [stateCounts, genderCounts, eventId],
  );

  const [{ state }] = useQueryStates(searchParams);

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "average", desc: false }],
      columnVisibility: {
        gender: false,
        stateRank: state.length > 0,
      },
    },
    getRowId: (originalRow) =>
      `${originalRow.personId}-${originalRow.competitionId}-${originalRow.average}`,
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
