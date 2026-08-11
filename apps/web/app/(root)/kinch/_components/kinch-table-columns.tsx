"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { cn } from "@workspace/ui/lib/utils";
import { KinchRanks } from "../_types";
import Link from "next/link";

interface Event {
  eventId: string;
  ratio: number;
}

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
}

export function getColumns({
  stateCounts,
  genderCounts,
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
    {
      accessorKey: "events_333",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-333" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "333");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_222",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-222" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "222");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_444",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-444" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "444");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_555",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-555" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "555");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_666",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-666" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "666");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_777",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-777" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "777");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_333bf",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-333bf" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "333bf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_333fm",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-333fm" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "333fm");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_333oh",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-333oh" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "333oh");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_clock",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-clock" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "clock");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_minx",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-minx" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "minx");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_pyram",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-pyram" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "pyram");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_skewb",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-skewb" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "skewb");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_sq1",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-sq1" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "sq1");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_444bf",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-444bf" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "444bf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_555bf",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-555bf" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "555bf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "events_333mbf",
      header: () => (
        <div className="flex items-center justify-center">
          <span className="cubing-icon event-333mbf" />
        </div>
      ),
      cell: ({ row }) => {
        const events = row.original.events as Event[];
        const event = events.find((event) => event.eventId === "333mbf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.ratio === 100 && "text-green-500 font-semibold",
              event?.ratio === 0 && "text-red-500 font-semibold",
            )}
          >
            {event?.ratio.toFixed(2)}
          </div>
        );
      },
      enableSorting: false,
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
