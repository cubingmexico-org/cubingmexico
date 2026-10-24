"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { CcCompetitors } from "@/components/cubing-contests/cc-competitors";
import { formatCcResult, type CcEventFormat } from "@/lib/cubing-contests";
import { formatDate } from "@/lib/utils";
import {
  rowStates,
  type CcRankType,
  type CcRankingRow,
} from "../../../../_lib/ranking";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  eventId: string;
  eventFormat: CcEventFormat;
  rankType: CcRankType;
}

export function getColumns({
  stateCounts,
  eventId,
  eventFormat,
  rankType,
}: GetColumnsProps): ColumnDef<CcRankingRow>[] {
  return [
    {
      accessorKey: "countryRank",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="NR" />
      ),
      cell: ({ row }) => <div>{row.original.countryRank}</div>,
      enableSorting: false,
      enableHiding: false,
      size: 20,
    },
    {
      id: "stateRank",
      accessorKey: "stateRank",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SR" />
      ),
      cell: ({ row }) => <div>{row.original.stateRank ?? "—"}</div>,
      enableSorting: false,
      enableHiding: false,
      size: 20,
    },
    {
      id: "name",
      accessorFn: (row) =>
        row.competitors.map((competitor) => competitor.name).join(", "),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <CcCompetitors competitors={row.original.competitors} />
        </div>
      ),
      meta: {
        label: "Nombre",
        variant: "text",
        placeholder: "Buscar por nombre...",
      },
      enableColumnFilter: true,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "best",
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resultado" />
      ),
      cell: ({ row }) => (
        <div className="font-bold">
          {formatCcResult(eventFormat, row.original.value, rankType)}
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "competition",
      accessorKey: "competitionName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Competencia" />
      ),
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <Link
            prefetch={false}
            href={`/competitions/${row.original.competitionId}/results/unofficial?event=${eventId}`}
            className="text-link hover:text-link/80"
          >
            {row.original.competitionName}
          </Link>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.original.date, row.original.date)}
          </div>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "state",
      accessorFn: (row) => rowStates(row).join(", "),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: () => null,
      meta: {
        label: "Estado",
        variant: "multiSelect",
        options: Object.keys(stateCounts).map((name) => ({
          label: name,
          value: name,
          count: stateCounts[name],
        })),
      },
      enableColumnFilter: true,
      enableSorting: false,
    },
  ];
}
