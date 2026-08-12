"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatAttemptValue, formatTime, formatTime333mbf } from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { ResultAverage, ResultSingle } from "../_types";
import { StateLabel } from "@/components/state-flag";
import type { EventId } from "@/types/wca";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
  eventId: EventId;
}

export function getSingleColumns({
  stateCounts,
  genderCounts,
  eventId,
}: GetColumnsProps): ColumnDef<ResultSingle>[] {
  return [
    {
      id: "index",
      accessorKey: "index",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="#" />
      ),
      cell: ({ row }) => <div>{row.getValue("index")}</div>,
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
      id: "best",
      accessorKey: "best",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resultado" />
      ),
      cell: ({ row }) => {
        if (eventId === "333fm") {
          return <div className="flex space-x-2">{row.getValue("best")}</div>;
        }

        if (eventId === "333mbf") {
          return (
            <div className="flex space-x-2">
              {formatTime333mbf(row.getValue("best"))}
            </div>
          );
        }

        return (
          <div className="flex space-x-2">
            {formatTime(row.getValue("best"))}
          </div>
        );
      },
      enableHiding: false,
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
          <div className="flex space-x-2">
            <StateLabel
              stateName={stateName}
              nameClassName={cn(
                stateName === null ? "text-muted-foreground" : "font-medium",
                "max-w-125 truncate",
              )}
            />
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
      id: "competition",
      accessorKey: "competition",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Competencia" />
      ),
      cell: ({ row }) => {
        const competitionId = row.original.competitionId;
        return (
          <div className="flex space-x-2 whitespace-nowrap">
            <Link
              className="text-link hover:text-link/80"
              href={`/competitions/${competitionId}`}
            >
              {row.getValue("competition")}
            </Link>
          </div>
        );
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
  ];
}

export function getAverageColumns({
  stateCounts,
  genderCounts,
  eventId,
}: GetColumnsProps): ColumnDef<ResultAverage>[] {
  return [
    {
      id: "index",
      accessorKey: "index",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="#" />
      ),
      cell: ({ row }) => <div>{row.getValue("index")}</div>,
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
      id: "average",
      accessorKey: "average",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resultado" />
      ),
      cell: ({ row }) => {
        if (eventId === "333fm") {
          return (
            <div className="flex space-x-2">
              {formatAttemptValue(
                eventId,
                Number(row.getValue("average")),
                "average",
              )}
            </div>
          );
        }

        return (
          <div className="flex space-x-2">
            {formatTime(row.getValue("average"))}
          </div>
        );
      },
      enableHiding: false,
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
          <div className="flex space-x-2">
            <StateLabel
              stateName={stateName}
              nameClassName={cn(
                stateName === null ? "text-muted-foreground" : "font-medium",
                "max-w-125 truncate",
              )}
            />
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
      id: "competition",
      accessorKey: "competition",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Competencia" />
      ),
      cell: ({ row }) => {
        const competitionId = row.original.competitionId;
        return (
          <div className="flex space-x-2 whitespace-nowrap">
            <Link
              className="text-link hover:text-link/80"
              href={`/competitions/${competitionId}`}
            >
              {row.getValue("competition")}
            </Link>
          </div>
        );
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
  ];
}
