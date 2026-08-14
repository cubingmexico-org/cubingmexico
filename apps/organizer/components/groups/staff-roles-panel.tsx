"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { Person, Role, WCIF } from "@/types/wcif";
import { setPersonStaffRoles } from "@/lib/groups/generate-assignments";

const TOGGLE_ROLES = [
  { value: "staff-judge" as const, label: "Juez" },
  { value: "staff-scrambler" as const, label: "Mezclador" },
  { value: "staff-runner" as const, label: "Corredor" },
  { value: "staff-other" as const, label: "Voluntario" },
];

function isOfficialLocked(person: Person): boolean {
  return (person.roles ?? []).some(
    (r) => r === "delegate" || r === "trainee-delegate" || r === "organizer",
  );
}

function officialLabels(person: Person): string[] {
  const labels: string[] = [];
  if ((person.roles ?? []).includes("delegate")) labels.push("Delegado");
  if ((person.roles ?? []).includes("trainee-delegate")) {
    labels.push("Delegado en formación");
  }
  if ((person.roles ?? []).includes("organizer")) labels.push("Organizador");
  if ((person.roles ?? []).includes("staff-dataentry")) {
    labels.push("Captura");
  }
  return labels;
}

export function StaffRolesPanel({
  wcif,
  onApply,
}: {
  wcif: WCIF;
  onApply: (next: WCIF) => void;
}) {
  const [search, setSearch] = useState("");

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...wcif.persons]
      .filter(
        (p) =>
          p.registration?.status === "accepted" ||
          p.registration?.isCompeting ||
          (p.roles ?? []).length > 0,
      )
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.wcaId?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        const aOff = isOfficialLocked(a) ? 0 : 1;
        const bOff = isOfficialLocked(b) ? 0 : 1;
        if (aOff !== bOff) return aOff - bOff;
        return a.name.localeCompare(b.name, "es");
      });
  }, [wcif.persons, search]);

  const toggleRole = (
    person: Person,
    role: (typeof TOGGLE_ROLES)[number]["value"],
    checked: boolean,
  ) => {
    if (isOfficialLocked(person) && role !== "staff-other") {
      // Officials can still be tagged staff-other but not task roles that
      // the engine already skips — allow toggles for documentation but warn.
    }
    const current = (person.roles ?? []).filter(
      (r): r is (typeof TOGGLE_ROLES)[number]["value"] =>
        TOGGLE_ROLES.some((t) => t.value === r),
    );
    const nextRoles = checked
      ? [...new Set([...current, role])]
      : current.filter((r) => r !== role);
    onApply(setPersonStaffRoles(wcif, person.wcaUserId, nextRoles));
    toast.success(
      checked
        ? `${person.name}: +${TOGGLE_ROLES.find((t) => t.value === role)?.label}`
        : `${person.name}: −${TOGGLE_ROLES.find((t) => t.value === role)?.label}`,
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Voluntarios</h3>
        <p className="text-sm text-muted-foreground">
          Marca quién es voluntario para que reciban más tareas al usar{" "}
          <strong>Asignar todo</strong>. Delegados y organizadores no reciben
          tareas de competencia (juez/mezclador/corredor); están ocupados con
          otras labores.
        </p>
      </div>

      <div className="space-y-1 max-w-sm">
        <Label htmlFor="staff-search">Buscar</Label>
        <Input
          id="staff-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre o WCA ID"
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Oficial</TableHead>
              {TOGGLE_ROLES.map((role) => (
                <TableHead key={role.value} className="text-center">
                  {role.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2 + TOGGLE_ROLES.length}
                  className="text-center text-muted-foreground"
                >
                  Sin personas
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => {
                const locked = isOfficialLocked(person);
                return (
                  <TableRow key={person.wcaUserId}>
                    <TableCell>
                      <div className="font-medium">{person.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {person.wcaId ?? "Nuevo"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {officialLabels(person).map((label) => (
                          <Badge key={label} variant="secondary">
                            {label}
                          </Badge>
                        ))}
                        {locked && (
                          <span className="text-xs text-muted-foreground">
                            Sin tareas de pista
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {TOGGLE_ROLES.map((role) => {
                      const checked = (person.roles as Role[]).includes(
                        role.value,
                      );
                      const disableTaskRole =
                        locked && role.value !== "staff-other";
                      return (
                        <TableCell key={role.value} className="text-center">
                          <Checkbox
                            checked={checked}
                            disabled={disableTaskRole}
                            onCheckedChange={(value) =>
                              toggleRole(person, role.value, value === true)
                            }
                            aria-label={`${person.name} ${role.label}`}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
