"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

import type { SumOfStateRanks } from "../_types";

interface Event {
  eventId: string;
  stateRank: number;
  completed: boolean;
}

interface GetColumnsProps {
  rankType: "single" | "average";
  genderCounts: Record<string, number>;
}

export function getColumns({
  rankType,
  genderCounts,
}: GetColumnsProps): ColumnDef<SumOfStateRanks>[] {
  const columns: ColumnDef<SumOfStateRanks>[] = [
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
        placeholder: "Buscar por nombre...",
        variant: "text",
      },
      enableHiding: false,
      enableColumnFilter: true,
    },
    {
      accessorKey: "overall",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-center font-semibold">
          {row.getValue("overall")}
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
        const event = events.find((item) => item.eventId === "333");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "222");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "444");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "555");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "666");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "777");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "333bf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "333fm");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "333oh");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "clock");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "minx");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "pyram");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "skewb");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "sq1");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "444bf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
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
        const event = events.find((item) => item.eventId === "555bf");
        return (
          <div
            className={cn(
              "flex space-x-2 justify-center",
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
          </div>
        );
      },
      enableSorting: false,
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

  if (rankType === "single") {
    columns.push({
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
              event?.stateRank !== undefined &&
                event.stateRank <= 10 &&
                "text-green-500 font-semibold",
              !event?.completed && "text-red-500 font-semibold",
            )}
          >
            {event?.stateRank ?? "N/A"}
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    });
  }

  return columns;
}
