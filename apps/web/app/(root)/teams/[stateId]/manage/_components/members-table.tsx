"use client";

import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { getMembers, getMembersGenderCounts } from "../../_lib/queries";
import { getColumns } from "./members-table-columns";
import { Member } from "../../_types";
import { DataTableRowAction } from "@/types/data-table";
import { DeleteMembersDialog } from "./delete-member-dialog";
import { UpdateMemberSheet } from "./update-member-sheet";
import { MembersTableActionBar } from "./members-table-action-bar";

interface MembersTableProps {
  promises: Promise<
    [
      Awaited<ReturnType<typeof getMembers>>,
      Awaited<ReturnType<typeof getMembersGenderCounts>>,
    ]
  >;
  stateId: string;
  canManageRoles: boolean;
}

export function MembersTable({
  promises,
  stateId,
  canManageRoles,
}: MembersTableProps) {
  const [{ data, pageCount }, genderCounts] = React.use(promises);

  const [rowAction, setRowAction] =
    React.useState<DataTableRowAction<Member> | null>(null);

  const columns = React.useMemo(
    () =>
      getColumns({
        genderCounts,
        setRowAction,
        canManageRoles,
        stateId,
      }),
    [genderCounts, canManageRoles, stateId],
  );

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnPinning: { right: ["actions"] },
      columnVisibility: {
        gender: false,
      },
    },
    getRowId: (originalRow) => originalRow.wcaId,
    shallow: false,
    clearOnDefault: true,
    enableRowSelection: true,
  });

  return (
    <>
      <DataTable
        table={table}
        actionBar={<MembersTableActionBar table={table} stateId={stateId} />}
      >
        <DataTableToolbar table={table} />
      </DataTable>
      <UpdateMemberSheet
        open={rowAction?.variant === "update"}
        onOpenChange={() => setRowAction(null)}
        member={rowAction?.row.original ?? null}
      />
      <DeleteMembersDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={() => setRowAction(null)}
        members={rowAction?.row.original ? [rowAction?.row.original] : []}
        showTrigger={false}
        stateId={stateId}
        onSuccess={() => rowAction?.row.toggleSelected(false)}
      />
    </>
  );
}
