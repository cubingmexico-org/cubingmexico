"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { formatAttemptValue, formatTime, formatTime333mbf } from "@/lib/utils";
import { RankSingle } from "../_types";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { StateLabel } from "@/components/state-flag";

interface GetColumnsProps {
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
  isState?: boolean;
}

export function getColumns({
  stateCounts,
  genderCounts,
}: GetColumnsProps): ColumnDef<RankSingle>[] {
  return [
    {
      accessorKey: "countryRank",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="NR" />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue("countryRank")}</div>;
      },
      enableHiding: false,
      size: 20,
    },
    {
      id: "stateRank",
      accessorKey: "stateRank",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SR" />
      ),
      cell: ({ row }) => {
        return <div>{row.getValue("stateRank")}</div>;
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
            <Link className="hover:underline" href={`/persons/${personId}`}>
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
      accessorKey: "best",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Resultado" />
      ),
      cell: ({ row }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const pathname = usePathname();
        const eventId = pathname.split("/")[2];
        const rankType = pathname.split("/")[3];

        if (eventId === "333fm") {
          return (
            <div className="flex space-x-2">
              {formatAttemptValue(
                eventId,
                Number(row.getValue("best")),
                rankType === "average" ? "average" : "single",
              )}
            </div>
          );
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
