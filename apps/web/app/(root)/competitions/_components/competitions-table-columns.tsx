"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { Competition } from "../_types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@workspace/ui/components/badge";
import { formatStatusName, getStatusIcon } from "../_lib/utils";
import { ExternalLink, Trophy } from "lucide-react";
import { WcaMonochrome } from "@workspace/icons";
import { StateLabel } from "@/components/state-flag";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  statusCounts: Record<"past" | "in_progress" | "upcoming", number>;
}

export function getColumns({
  stateCounts,
  statusCounts,
}: GetColumnsProps): ColumnDef<Competition>[] {
  return [
    {
      accessorKey: "startDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fecha" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2 whitespace-nowrap">
            <span>
              {formatDate(row.getValue("startDate"), row.original.endDate)}
            </span>
          </div>
        );
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
        const enumValues = {
          past: "Pasada",
          in_progress: "En progreso",
          upcoming: "Próxima",
        };
        const label =
          enumValues[row.original.status as keyof typeof enumValues];

        return (
          <div className="flex space-x-2">
            {(row.original.isChampionship as boolean) && (
              <Badge className="bg-green-600 text-white dark:bg-green-700">
                <Trophy />
                Campeonato
              </Badge>
            )}
            <Badge
              variant={
                row.original.status === "upcoming"
                  ? "default"
                  : row.original.status === "in_progress"
                    ? "outline"
                    : "secondary"
              }
            >
              {label}
            </Badge>
            <Link
              className="truncate font-medium text-link hover:text-link/80"
              href={`/competitions/${row.original.id}`}
            >
              {row.getValue("name")}
            </Link>
          </div>
        );
      },
      meta: {
        label: "Nombre",
        placeholder: "Buscar por nombre...",
        variant: "text",
      },
      enableColumnFilter: true,
      enableHiding: false,
    },
    {
      accessorKey: "events",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Eventos" />
      ),
      cell: ({ row }) => {
        const eventIds = row.getValue("events") as string[];
        return (
          <div className="flex space-x-2">
            {eventIds.map((eventId) => (
              <span key={eventId} className={`cubing-icon event-${eventId}`} />
            ))}
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
            {stateName ? (
              <StateLabel
                stateName={stateName}
                nameClassName="truncate font-medium"
              />
            ) : (
              <span className="truncate font-medium text-muted-foreground">
                N/A
              </span>
            )}
          </div>
        );
      },
      meta: {
        label: "Estado",
        placeholder: "Buscar por estado...",
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
      accessorKey: "kinch",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Kinch Ranks" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <Link
              className="flex items-center truncate hover:underline"
              href={`https://comp-kinch.sylvermyst.com/#/competition/${row.original.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Comp-Kinch
              <ExternalLink className="ml-1 size-4" />
            </Link>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "wca-live",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="WCA Live" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <Link
              className="flex items-center truncate hover:underline"
              href={`https://live.worldcubeassociation.org/link/competitions/${row.original.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WcaMonochrome className="mr-1 size-4" />
              WCA Live
            </Link>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "status",
      accessorKey: "status",
      meta: {
        label: "Estatus",
        variant: "multiSelect",
        options: Object.keys(statusCounts).map((name) => {
          const statusName = name as "past" | "in_progress" | "upcoming";
          return {
            label: formatStatusName(statusName),
            value: statusName,
            icon: getStatusIcon(statusName),
            count: statusCounts[statusName],
          };
        }),
      },
      enableColumnFilter: true,
      enableHiding: false,
    },
  ];
}
