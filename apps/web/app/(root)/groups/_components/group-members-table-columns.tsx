"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableRowAction } from "@/types/data-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import type { GroupMembership } from "@workspace/db/schema";
import { StateLabel } from "@/components/state-flag";
import type { GroupMember } from "../_types";
import {
  updateGroupMemberHideFromRoster,
  updateGroupMemberRole,
} from "../_lib/actions";

interface GetColumnsProps {
  genderCounts: Record<string, number>;
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<GroupMember> | null>
  >;
  canManageRoles: boolean;
  groupId: string;
}

function RoleCell({
  member,
  groupId,
  canManageRoles,
}: {
  member: GroupMember;
  groupId: string;
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
          const { error } = await updateGroupMemberRole({
            personId: member.wcaId,
            groupId,
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
      <SelectTrigger className="h-8 w-32">
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

function HideFromRosterCell({
  member,
  groupId,
}: {
  member: GroupMember;
  groupId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Switch
      checked={member.hideFromRoster}
      disabled={pending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          const { error, warning } = await updateGroupMemberHideFromRoster({
            personId: member.wcaId,
            groupId,
            hideFromRoster: checked,
          });

          if (error) {
            toast.error(error);
            return;
          }

          toast.success(
            checked
              ? "Oculto de rankings y registros"
              : "Visible en rankings y registros",
          );
          if (warning) toast.warning(warning);
          router.refresh();
        });
      }}
      aria-label={`Ocultar a ${member.name ?? member.wcaId} de rankings y registros`}
    />
  );
}

export function getGroupMemberColumns({
  genderCounts,
  setRowAction,
  canManageRoles,
  groupId,
}: GetColumnsProps): ColumnDef<GroupMember>[] {
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
      cell: ({ row }) => (
        <Link
          className="text-accent-foreground hover:underline"
          href={`https://www.worldcubeassociation.org/persons/${row.getValue("wcaId")}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {row.getValue("wcaId")}
        </Link>
      ),
      enableHiding: false,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      cell: ({ row }) => (
        <div className="flex w-72 items-center gap-2 space-x-2">
          <Link
            prefetch={false}
            className="text-link hover:text-link/80"
            href={`/persons/${row.original.wcaId}`}
          >
            {row.getValue("name")}
          </Link>
          {row.original.hideFromRoster ? (
            <Badge variant="outline" className="text-muted-foreground">
              Oculto de rankings
            </Badge>
          ) : null}
        </div>
      ),
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
          groupId={groupId}
          canManageRoles={canManageRoles}
        />
      ),
      enableHiding: false,
    },
    {
      id: "hideFromRoster",
      accessorKey: "hideFromRoster",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ocultar" />
      ),
      cell: ({ row }) => (
        <HideFromRosterCell member={row.original} groupId={groupId} />
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "state",
      accessorKey: "state",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ row }) => {
        const stateId = row.original.stateId;
        const state = row.original.state;
        if (!stateId || !state) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Link
            href={`/teams/${stateId}`}
            prefetch={false}
            className="hover:underline"
          >
            <StateLabel stateId={stateId} stateName={state} />
          </Link>
        );
      },
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
      filterFn: (row, id, value: string[]) => {
        if (!value?.length) return true;
        return value.includes(row.getValue(id));
      },
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
        ) as GroupMembership["specialties"];

        return (
          <div className="flex w-72 space-x-2">
            {specialties?.length ? (
              specialties.map((specialty) => (
                <span
                  className={`cubing-icon event-${specialty}`}
                  key={specialty}
                />
              ))
            ) : (
              <span className="text-muted-foreground">Sin especialidades</span>
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
