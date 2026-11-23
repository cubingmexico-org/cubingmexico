"use client";

import * as React from "react";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { DataTableRowAction } from "@/types/data-table";
import type { GroupMember } from "../_types";
import { DeleteGroupMembersDialog } from "./delete-group-members-dialog";
import { getGroupMemberColumns } from "./group-members-table-columns";
import { GroupMembersTableActionBar } from "./group-members-table-action-bar";
import { UpdateGroupMemberSheet } from "./update-group-member-sheet";

interface GroupMembersTableProps {
  members: GroupMember[];
  groupId: string;
  canManageRoles: boolean;
}

export function GroupMembersTable({
  members,
  groupId,
  canManageRoles,
}: GroupMembersTableProps) {
  const genderCounts = React.useMemo(() => {
    return members.reduce(
      (acc, member) => {
        if (!member.gender) return acc;
        acc[member.gender] = (acc[member.gender] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [members]);

  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<GroupMember> | null>(null);

  const columns = React.useMemo(
    () =>
      getGroupMemberColumns({
        genderCounts,
        setRowAction,
        canManageRoles,
        groupId,
      }),
    [genderCounts, canManageRoles, groupId],
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns unstable functions by design
  const table = useReactTable({
    data: members,
    columns,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnPinning: { right: ["actions"] },
      columnVisibility: {
        gender: false,
      },
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    getRowId: (originalRow) => originalRow.wcaId,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <>
      <DataTable
        table={table}
        actionBar={
          <GroupMembersTableActionBar table={table} groupId={groupId} />
        }
      >
        <DataTableToolbar table={table} />
      </DataTable>
      <UpdateGroupMemberSheet
        open={rowAction?.variant === "update"}
        onOpenChange={() => setRowAction(null)}
        member={rowAction?.row.original ?? null}
        groupId={groupId}
      />
      <DeleteGroupMembersDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={() => setRowAction(null)}
        members={rowAction?.row.original ? [rowAction.row.original] : []}
        showTrigger={false}
        groupId={groupId}
        onSuccess={() => rowAction?.row.toggleSelected(false)}
      />
    </>
  );
}
