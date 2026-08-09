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

export function getColumns(props: GetColumnsProps): ColumnDef<StreakRanks>[] {
  void props;
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
      accessorKey: "currentStreak",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Racha Actual" />
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
        <DataTableColumnHeader column={column} title="Racha Más Larga" />
      ),
      cell: ({ row }) => (
        <div className="flex space-x-2 justify-center font-semibold">
          {row.getValue("longestStreak")}
        </div>
      ),
      enableHiding: false,
    },
    // {
    //   accessorKey: "state",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader column={column} title="Estado" />
    //   ),
    //   cell: ({ row }) => {
    //     const state = row.getValue("state");
    //     return <div className="flex space-x-2">{state}</div>;
    //   },
    //   meta: {
    //     label: "Estado",
    //     variant: "filter",
    //     options: Object.entries(stateCounts).map(([name, count]) => ({
    //       label: `${name} (${count})`,
    //       value: name,
    //     })),
    //   },
    //   enableColumnFilter: true,
    // },
    {
      accessorKey: "gender",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Género" />
      ),
      cell: ({ row }) => {
        const gender = row.getValue("gender");
        const genderMap: Record<string, string> = {
          m: "Masculino",
          f: "Femenino",
          o: "Otro",
        };
        return (
          <div className="flex space-x-2">
            {gender ? genderMap[gender as string] : "-"}
          </div>
        );
      },
      // meta: {
      //   label: "Género",
      //   variant: "filter",
      //   options: Object.entries(genderCounts).map(([gender, count]) => {
      //     const genderMap: Record<string, string> = {
      //       m: "Masculino",
      //       f: "Femenino",
      //       o: "Otro",
      //     };
      //     return {
      //       label: `${genderMap[gender]} (${count})`,
      //       value: gender,
      //     };
      //   }),
      // },
      enableColumnFilter: true,
    },
  ];
}
