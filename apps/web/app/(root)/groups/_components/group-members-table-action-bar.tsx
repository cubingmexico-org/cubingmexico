"use client";

import type { Table } from "@tanstack/react-table";
import { Download, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import { Separator } from "@workspace/ui/components/separator";
import { exportTableToCSV } from "@/lib/export";
import type { GroupMember } from "../_types";
import { deleteGroupMembers } from "../_lib/actions";

type Action = "export" | "delete";

interface GroupMembersTableActionBarProps {
  table: Table<GroupMember>;
  groupId: string;
}

export function GroupMembersTableActionBar({
  table,
  groupId,
}: GroupMembersTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<Action | null>(null);

  const getIsActionPending = React.useCallback(
    (action: Action) => isPending && currentAction === action,
    [isPending, currentAction],
  );

  const onMemberExport = React.useCallback(() => {
    setCurrentAction("export");
    startTransition(() => {
      exportTableToCSV(table, {
        excludeColumns: ["select", "actions"],
        onlySelected: true,
      });
    });
  }, [table]);

  const onMemberDelete = React.useCallback(() => {
    setCurrentAction("delete");
    startTransition(async () => {
      const { error, warning } = await deleteGroupMembers({
        ids: rows.map((row) => row.original.wcaId),
        groupId,
      });

      if (error) {
        toast.error(error);
        return;
      }
      if (warning) {
        toast.warning(warning);
      } else {
        toast.success("Miembros eliminados");
      }
      table.toggleAllRowsSelected(false);
    });
  }, [rows, groupId, table]);

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <DataTableActionBarAction
          size="icon"
          tooltip="Export members"
          isPending={getIsActionPending("export")}
          onClick={onMemberExport}
        >
          <Download />
        </DataTableActionBarAction>
        <DataTableActionBarAction
          size="icon"
          tooltip="Delete members"
          isPending={getIsActionPending("delete")}
          onClick={onMemberDelete}
        >
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
