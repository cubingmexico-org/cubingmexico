"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Member } from "../_types";
import Link from "next/link";
import { TeamMember } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/badge";

interface GetColumnsProps {
  genderCounts: Record<string, number>;
}

export function getColumns({
  genderCounts,
}: GetColumnsProps): ColumnDef<Member>[] {
  return [
    {
      accessorKey: "wcaId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="WCA ID" />
      ),
      cell: ({ row }) => {
        return (
          <div>
            <Link
              className="hover:underline text-accent-foreground"
              href={`https://www.worldcubeassociation.org/persons/${row.getValue("wcaId")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.getValue("wcaId")}
            </Link>
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
        return (
          <div className="flex space-x-2 whitespace-nowrap">
            <Link
              className="hover:underline text-accent-foreground"
              href={`/persons/${row.original.wcaId}`}
            >
              {row.getValue("name")}
            </Link>
            {row.original.isAdmin && <Badge>Admin</Badge>}
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
      accessorKey: "podiums",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Podios" />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="text-accent-foreground">
              {row.getValue("podiums")}
            </span>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "stateRecords",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-xs"
          column={column}
          title="Récords Estatales"
        />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex space-x-2">
            <span className="text-accent-foreground">
              {row.getValue("stateRecords")}
            </span>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "specialties",
      header: ({ column }) => (
        <DataTableColumnHeader
          className="text-xs"
          column={column}
          title="Especialidades"
        />
      ),
      cell: ({ row }) => {
        const specialties = row.getValue(
          "specialties",
        ) as TeamMember["specialties"];

        return (
          <div className="flex space-x-2 w-72">
            {specialties ? (
              <>
                {specialties.map((specialty) => (
                  <span
                    className={`cubing-icon event-${specialty}`}
                    key={specialty}
                  />
                ))}
              </>
            ) : (
              <span className="text-muted-foreground">Sin especilidades</span>
            )}
          </div>
        );
      },
      enableHiding: false,
    },
    // {
    //   accessorKey: "achievements",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader
    //       className="text-xs"
    //       column={column}
    //       title="Logros"
    //     />
    //   ),
    //   cell: ({ row }) => {
    //     const achievements = row.getValue(
    //       "achievements",
    //     ) as TeamMember["achievements"];

    //     return (
    //       <div className="flex space-x-2 w-72">
    //         {achievements ? (
    //           <>
    //             {achievements.map((achievement) => (
    //               <span className="text-accent-foreground" key={achievement}>
    //                 {achievement}
    //               </span>
    //             ))}
    //           </>
    //         ) : (
    //           <span className="text-muted-foreground">Sin logros</span>
    //         )}
    //       </div>
    //     );
    //   },
    //   enableSorting: false,
    //   enableHiding: false,
    // },
  ];
}
