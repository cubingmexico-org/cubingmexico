"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Member } from "../../_types";
import Link from "next/link";
import { TeamMember } from "@workspace/db/schema";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { DataTableRowAction } from "@/types/data-table";

interface GetColumnsProps {
  genderCounts: Record<string, number>;
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Member> | null>
  >;
}

export function getColumns({
  genderCounts,
  setRowAction,
}: GetColumnsProps): ColumnDef<Member>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      size: 32,
      enableSorting: false,
      enableHiding: false,
    },
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
          <div className="flex space-x-2 w-72">
            <Link
              className="hover:underline text-accent-foreground"
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
      enableSorting: false,
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
    {
      id: "actions",
      cell: function Cell({ row }) {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, variant: "update" })}
              >
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => setRowAction({ row, variant: "delete" })}
              >
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 32,
    },
  ];
}
