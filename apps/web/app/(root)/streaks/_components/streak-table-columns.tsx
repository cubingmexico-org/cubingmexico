"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { StreakRanks } from "../_types";
import Link from "next/link";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
}

export function getColumns({
  stateCounts,
  genderCounts,
}: GetColumnsProps): ColumnDef<StreakRanks>[] {
  return [
    {
      accessorKey: "rank",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="#" />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue("rank")}</div>;
      },
      enableHiding: false,
      size: 20,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => {
        const personId = row.original.personId;
        return (
          <div className="flex space-x-2 whitespace-nowrap">
            <Link
              className="text-link hover:text-link/80"
              href={`/persons/${personId}`}
            >
              {row.getValue("name")}
            </Link>
          </div>
        );
      },
      meta: {
        label: "Nombre",
        variant: "text",
        placeholder: "Buscar por nombre...",
      },
      enableColumnFilter: true,
      enableHiding: false,
    },
    {
      accessorKey: "currentStreak",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Actual" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-center font-semibold">
          {row.getValue("currentStreak")}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "longestStreak",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Más Larga" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-center font-semibold">
          {row.getValue("longestStreak")}
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
