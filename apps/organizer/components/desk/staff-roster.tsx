"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { State } from "@/db/queries";
import { exportRowsToCsv } from "@/lib/export-csv";
import {
  comparePersonsByRoleThenName,
  formatPersonRoles,
  hasOfficialRole,
} from "@/lib/person-roles";
import type { ExtendedPerson, Role } from "@/types/wcif";

const ROLE_FILTERS: { value: "all" | Role; label: string }[] = [
  { value: "all", label: "Todos los roles" },
  { value: "delegate", label: "Delegado" },
  { value: "trainee-delegate", label: "Delegado en formación" },
  { value: "organizer", label: "Organizador" },
  { value: "staff-judge", label: "Juez" },
  { value: "staff-scrambler", label: "Scrambler" },
  { value: "staff-runner", label: "Runner" },
  { value: "staff-dataentry", label: "Captura de datos" },
  { value: "staff-announcer", label: "Anunciador" },
  { value: "staff-other", label: "Staff" },
];

function countryName(iso2: string): string {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
}

export function StaffRoster({
  persons,
  states,
  competitionId,
}: {
  persons: ExtendedPerson[];
  states: State[];
  competitionId: string;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");

  const staff = useMemo(
    () =>
      persons
        .filter(hasOfficialRole)
        .slice()
        .sort(comparePersonsByRoleThenName),
    [persons],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((person) => {
      if (roleFilter !== "all" && !person.roles.includes(roleFilter)) {
        return false;
      }
      if (!query) return true;
      return (
        person.name.toLowerCase().includes(query) ||
        (person.wcaId?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [staff, search, roleFilter]);

  const stateName = (stateId: string | null) =>
    stateId ? (states.find((s) => s.id === stateId)?.name ?? stateId) : "—";

  const handleExport = () => {
    exportRowsToCsv(
      filtered.map((person) => ({
        Nombre: person.name,
        "WCA ID": person.wcaId ?? "",
        Roles: formatPersonRoles(person),
        País: countryName(person.countryIso2),
        Estado: stateName(person.stateId) === "—" ? "" : stateName(person.stateId),
        Compite: person.registration?.isCompeting ? "Sí" : "No",
      })),
      { filename: `${competitionId}-staff` },
    );
  };

  if (staff.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay personas con roles de staff, organizador o delegado en el WCIF.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="staff-search">Buscar</Label>
            <Input
              id="staff-search"
              placeholder="Nombre o WCA ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value as "all" | Role)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} de {staff.length} personas
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>WCA ID</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Compite</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((person) => (
            <TableRow key={person.wcaUserId}>
              <TableCell className="font-medium">{person.name}</TableCell>
              <TableCell>{person.wcaId ?? "—"}</TableCell>
              <TableCell>{formatPersonRoles(person)}</TableCell>
              <TableCell>{countryName(person.countryIso2)}</TableCell>
              <TableCell>{stateName(person.stateId)}</TableCell>
              <TableCell>
                {person.registration?.isCompeting ? "Sí" : "No"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
