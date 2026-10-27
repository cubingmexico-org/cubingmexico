"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { cn } from "@workspace/ui/lib/utils";
import { KinchRanks } from "../_types";
import Link from "next/link";
import { crossEventIds, type EventScope } from "@/lib/constants";

interface Event {
  eventId: string;
  ratio: number;
}

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
  scope: EventScope;
}

function makeEventColumn(eventId: string): ColumnDef<KinchRanks> {
  return {
    accessorKey: `events_${eventId}`,
    header: () => (
      <div className="flex items-center justify-center">
        <span className={`cubing-icon event-${eventId}`} />
      </div>
    ),
    cell: ({ row }) => {
      const events = row.original.events as Event[];
      const event = events.find((event) => event.eventId === eventId);
      return (
        <div
          className={cn(
            "flex space-x-2 justify-center",
            event?.ratio === 100 &&
              "text-green-700 dark:text-green-400 font-semibold",
            event?.ratio === 0 &&
              "text-red-600 dark:text-red-400 font-semibold",
          )}
        >
          {event?.ratio.toFixed(2)}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}

export function getColumns({
  stateCounts,
  genderCounts,
  scope,
}: GetColumnsProps): ColumnDef<KinchRanks>[] {
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
              prefetch={false}
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
      accessorKey: "overall",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-center font-semibold">
          {(row.getValue("overall") as number).toFixed(2)}
        </div>
      ),
      enableHiding: false,
    },
    ...crossEventIds(scope).map(makeEventColumn),
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
