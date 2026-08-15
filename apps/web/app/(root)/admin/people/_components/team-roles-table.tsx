"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  updateAdminMemberRole,
  updatePersonHideFromRoster,
} from "../../_lib/actions";

type Member = {
  wcaId: string;
  name: string | null;
  role: "admin" | "editor" | null;
  hideFromRoster: boolean;
};

export function TeamRolesTable({
  stateId,
  members,
}: {
  stateId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function onRoleChange(
    personId: string,
    role: "admin" | "editor" | "none",
  ) {
    setPendingId(personId);
    const result = await updateAdminMemberRole({
      personId,
      stateId,
      role: role === "none" ? null : role,
    });
    setPendingId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Rol actualizado");
    router.refresh();
  }

  async function onHideFromRosterChange(
    personId: string,
    hideFromRoster: boolean,
  ) {
    setPendingId(personId);
    const result = await updatePersonHideFromRoster({
      personId,
      hideFromRoster,
    });
    setPendingId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      hideFromRoster ? "Oculto del directorio" : "Visible en el directorio",
    );
    router.refresh();
  }

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay personas afiliadas a este estado.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Persona</TableHead>
            <TableHead>WCA ID</TableHead>
            <TableHead className="w-40">Rol</TableHead>
            <TableHead className="w-48">Ocultar del directorio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.wcaId}>
              <TableCell>{member.name}</TableCell>
              <TableCell className="font-mono text-xs">
                {member.wcaId}
              </TableCell>
              <TableCell>
                <Select
                  value={member.role ?? "none"}
                  disabled={pendingId === member.wcaId}
                  onValueChange={(value) =>
                    void onRoleChange(
                      member.wcaId,
                      value as "admin" | "editor" | "none",
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin rol</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Switch
                  checked={member.hideFromRoster}
                  disabled={pendingId === member.wcaId}
                  onCheckedChange={(checked) =>
                    void onHideFromRosterChange(member.wcaId, checked)
                  }
                  aria-label={`Ocultar ${member.name ?? member.wcaId} del directorio`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
