"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { cn } from "@workspace/ui/lib/utils";
import { getSumOfRanksBaseEventIds } from "@/lib/sum-of-ranks-events";

export type SumOfRanksRankKey = "countryRank" | "stateRank";

export { getSumOfRanksBaseEventIds } from "@/lib/sum-of-ranks-events";

type SumOfRanksEvent = {
  eventId: string;
  completed: boolean;
  countryRank?: number;
  stateRank?: number;
};

type SumOfRanksRow = {
  personId: string;
  events: unknown;
  rank?: number | null;
  name?: string | null;
  overall?: number | null;
  state?: string | null;
  gender?: string | null;
};

interface GetSumOfRanksColumnsProps {
  rankType: "single" | "average";
  rankKey: SumOfRanksRankKey;
  genderCounts: Record<string, number>;
  stateCounts?: Record<string, number>;
}

function eventRankValue(
  event: SumOfRanksEvent | undefined,
  rankKey: SumOfRanksRankKey,
): number | undefined {
  if (!event) return undefined;
  return event[rankKey];
}

function makeEventColumn<TRow extends SumOfRanksRow>(
  eventId: string,
  rankKey: SumOfRanksRankKey,
): ColumnDef<TRow> {
  return {
    accessorKey: `events_${eventId}`,
    header: () => (
      <div className="flex items-center justify-center">
        <span className={`cubing-icon event-${eventId}`} />
      </div>
    ),
    cell: ({ row }) => {
      const events = row.original.events as SumOfRanksEvent[];
      const event = events.find((item) => item.eventId === eventId);
      const rank = eventRankValue(event, rankKey);
      return (
        <div
          className={cn(
            "flex space-x-2 justify-center",
            rank !== undefined && rank <= 10 && "text-green-500 font-semibold",
            !event?.completed && "text-red-500 font-semibold",
          )}
        >
          {rank ?? "N/A"}
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}

export function getSumOfRanksColumns<TRow extends SumOfRanksRow>({
  rankType,
  rankKey,
  genderCounts,
  stateCounts,
}: GetSumOfRanksColumnsProps): ColumnDef<TRow>[] {
  const columns: ColumnDef<TRow>[] = [
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
    ...getSumOfRanksBaseEventIds().map((eventId) =>
      makeEventColumn<TRow>(eventId, rankKey),
    ),
  ];

  if (stateCounts) {
    columns.push({
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
    });
  }

  columns.push({
    id: "gender",
    accessorKey: "gender",
    meta: {
      label: "Género",
      variant: "multiSelect",
      options: Object.keys(genderCounts).map((name) => ({
        label: name === "m" ? "Masculino" : name === "f" ? "Femenino" : "Otro",
        value: name,
        count: genderCounts[name],
      })),
    },
    enableColumnFilter: true,
  });

  if (rankType === "single") {
    columns.push(makeEventColumn<TRow>("333mbf", rankKey));
  }

  return columns;
}
