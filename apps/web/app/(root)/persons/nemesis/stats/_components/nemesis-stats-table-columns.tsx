"use client";

import * as React from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { NemesisStatsRow } from "../_types";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
}

export function getColumns({
  stateCounts,
  genderCounts,
}: GetColumnsProps): ColumnDef<NemesisStatsRow>[] {
  return [
    {
      accessorKey: "rank",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="#" />
      ),
      cell: ({ row }) => <div>{row.getValue("rank")}</div>,
      enableSorting: false,
      enableHiding: false,
      size: 20,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2 whitespace-nowrap">
          <Link
            prefetch={false}
            className="text-link hover:text-link/80"
            href={`/persons/nemesis?id=${row.original.personId}`}
          >
            {row.getValue("name") ?? row.original.personId}
          </Link>
        </div>
      ),
      meta: {
        label: "Nombre",
        variant: "text",
        placeholder: "Buscar por nombre...",
      },
      enableColumnFilter: true,
      enableHiding: false,
    },
    {
      accessorKey: "eventCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Eventos" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">{row.getValue("eventCount")}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "nemesisCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Némesis" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center font-semibold">
          {row.getValue("nemesisCount")}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "nemesizedCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nemesizados" />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center font-semibold">
          {row.getValue("nemesizedCount")}
        </div>
      ),
      enableHiding: false,
    },
    {
      id: "state",
      accessorKey: "state",
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
    },
    {
      id: "gender",
      accessorKey: "gender",
      meta: {
        label: "Género",
        variant: "multiSelect",
        options: Object.keys(genderCounts).map((name) => ({
          label:
            name === "m" ? "Masculino" : name === "f" ? "Femenino" : "Otro",
          value: name,
          count: genderCounts[name],
        })),
      },
      enableColumnFilter: true,
    },
  ];
}
