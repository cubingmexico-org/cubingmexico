"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import type { Person } from "@/types/wcif";
import {
  type LocatedActivity,
  parseGroupNumber,
} from "@/lib/groups/wcif-schedule";
import { ASSIGNMENT_CODES } from "./assignment-rows";

export function ManualAssignmentForm({
  people,
  groups,
  onAssign,
}: {
  people: Person[];
  groups: LocatedActivity[];
  onAssign: (assignment: {
    wcaUserId: number;
    activityId: number;
    assignmentCode: string;
  }) => void;
}) {
  const [personId, setPersonId] = useState<string>("");
  const [activityId, setActivityId] = useState<string>("");
  const [code, setCode] = useState<string>("competitor");

  const handleAssign = () => {
    if (!personId || !activityId) {
      toast.error("Selecciona persona y grupo");
      return;
    }
    onAssign({
      wcaUserId: Number(personId),
      activityId: Number(activityId),
      assignmentCode: code,
    });
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold text-sm">Asignación manual</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="manual-person">Persona</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger id="manual-person">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.wcaUserId} value={String(p.wcaUserId)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="manual-group">Grupo</Label>
          <Select value={activityId} onValueChange={setActivityId}>
            <SelectTrigger id="manual-group">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.activity.id} value={String(g.activity.id)}>
                  G{parseGroupNumber(g.activity.activityCode)} · {g.roomName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="manual-role">Rol</Label>
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger id="manual-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNMENT_CODES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="button" className="w-full" onClick={handleAssign}>
            Asignar
          </Button>
        </div>
      </div>
    </div>
  );
}
