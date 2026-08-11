"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Person } from "../_types";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";
import {
  getOrganizerLevelFilterOptions,
  type OrganizerLevelFilter,
} from "@/lib/organizer-level";
import { StateLabel } from "@/components/state-flag";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
  levelCounts: Record<OrganizerLevelFilter, number>;
}

export function getColumns({
  stateCounts,
  genderCounts,
  levelCounts,
}: GetColumnsProps): ColumnDef<Person>[] {
  return [
    {
      accessorKey: "wcaId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="WCA ID" />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue("wcaId")}</div>;
      },
      enableHiding: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => {
        const level = row.original.level;

        return (
          <div className="flex space-x-2 whitespace-nowrap">
            <Badge variant="outline">{level}</Badge>
            <Link
              className="text-link hover:text-link/80"
              href={`/persons/${row.original.wcaId}`}
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
      enableHiding: false,
      enableColumnFilter: true,
    },
    {
      id: "state",
      accessorKey: "state",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ row }) => {
        const stateName = row.getValue("state") as string | null;
        return (
          <div className="flex space-x-2 whitespace-nowrap">
            {stateName ? (
              <StateLabel stateName={stateName} />
            ) : (
              <span className="text-muted-foreground font-light">N/A</span>
            )}
          </div>
        );
      },
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
      enableHiding: false,
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
    {
      id: "level",
      accessorKey: "level",
      meta: {
        label: "Nivel",
        variant: "multiSelect",
        options: getOrganizerLevelFilterOptions(levelCounts),
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "competitions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Recientes" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2">{row.getValue("competitions")}</div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "totalCompetitions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {row.getValue("totalCompetitions")}
        </div>
      ),
      enableHiding: false,
    },
  ];
}
