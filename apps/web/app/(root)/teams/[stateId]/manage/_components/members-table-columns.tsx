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
import { Badge } from "@workspace/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { DataTableRowAction } from "@/types/data-table";
import { toast } from "sonner";
import { updateMemberRole } from "../_lib/actions";
import { useRouter } from "next/navigation";

interface GetColumnsProps {
  genderCounts: Record<string, number>;
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<Member> | null>
  >;
  canManageRoles: boolean;
  stateId: string;
}

function RoleCell({
  member,
  stateId,
  canManageRoles,
}: {
  member: Member;
  stateId: string;
  canManageRoles: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  if (!canManageRoles) {
    if (member.role === "admin") {
      return <Badge>Admin</Badge>;
    }
    if (member.role === "editor") {
      return <Badge variant="secondary">Editor</Badge>;
    }
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Select
      disabled={pending}
      value={member.role ?? "none"}
      onValueChange={(value) => {
        startTransition(async () => {
          const role = value === "admin" || value === "editor" ? value : null;
          const { error } = await updateMemberRole({
            personId: member.wcaId,
            stateId,
            role,
          });

          if (error) {
            toast.error(error);
            return;
          }

          toast.success("Rol actualizado");
          router.refresh();
        });
      }}
    >
      <SelectTrigger className="w-32 h-8">
        <SelectValue placeholder="Sin rol" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin rol</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function getColumns({
  genderCounts,
  setRowAction,
  canManageRoles,
  stateId,
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
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rol" />
      ),
      cell: ({ row }) => (
        <RoleCell
          member={row.original}
          stateId={stateId}
          canManageRoles={canManageRoles}
        />
      ),
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
