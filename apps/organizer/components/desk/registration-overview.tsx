"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
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
import type { ExtendedPerson } from "@/types/wcif";

function countryName(iso2: string): string {
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
}

export function RegistrationOverview({
  persons,
  states,
  competitionId,
}: {
  persons: ExtendedPerson[];
  states: State[];
  competitionId: string;
}) {
  const [search, setSearch] = useState("");
  const [competingOnly, setCompetingOnly] = useState(true);

  const registered = useMemo(
    () =>
      persons
        .filter((person) => person.registration != null)
        .slice()
        .sort((a, b) => {
          const idA = a.registrantId ?? Number.MAX_SAFE_INTEGER;
          const idB = b.registrantId ?? Number.MAX_SAFE_INTEGER;
          if (idA !== idB) return idA - idB;
          return a.name.localeCompare(b.name, "es");
        }),
    [persons],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return registered.filter((person) => {
      if (competingOnly && !person.registration?.isCompeting) return false;
      if (!query) return true;
      return (
        person.name.toLowerCase().includes(query) ||
        (person.wcaId?.toLowerCase().includes(query) ?? false) ||
        String(person.registrantId ?? "").includes(query)
      );
    });
  }, [registered, search, competingOnly]);

  const stateName = (stateId: string | null) =>
    stateId ? (states.find((s) => s.id === stateId)?.name ?? stateId) : "—";

  const handleExport = () => {
    exportRowsToCsv(
      filtered.map((person) => ({
        Nombre: person.name,
        "ID registro": person.registrantId ?? "",
        "WCA ID": person.wcaId ?? "",
        País: countryName(person.countryIso2),
        Estado:
          stateName(person.stateId) === "—" ? "" : stateName(person.stateId),
        Eventos: person.registration?.eventIds.join(" ") ?? "",
        Estatus: person.registration?.status ?? "",
        Compite: person.registration?.isCompeting ? "Sí" : "No",
      })),
      {
        filename: `${competitionId}-inscripciones`,
        columns: [
          "Nombre",
          "ID registro",
          "WCA ID",
          "País",
          "Estado",
          "Eventos",
          "Estatus",
          "Compite",
        ],
      },
    );
  };

  if (registered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay personas inscritas en el WCIF público.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vista de solo lectura del día de la competencia. No reemplaza el
        registro de la WCA y no permite editar inscripciones.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registration-search">Buscar</Label>
            <Input
              id="registration-search"
              placeholder="Nombre, WCA ID o ID de registro"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 pb-2">
            <Switch
              id="competing-only"
              checked={competingOnly}
              onCheckedChange={setCompetingOnly}
            />
            <Label htmlFor="competing-only">Solo quienes compiten</Label>
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
        {filtered.length} de {registered.length} personas
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>WCA ID</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Eventos</TableHead>
            <TableHead>Compite</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((person) => (
            <TableRow
              key={`${person.wcaUserId}-${person.registrantId ?? "none"}`}
            >
              <TableCell className="font-medium">{person.name}</TableCell>
              <TableCell>{person.registrantId ?? "—"}</TableCell>
              <TableCell>{person.wcaId ?? "—"}</TableCell>
              <TableCell>{countryName(person.countryIso2)}</TableCell>
              <TableCell>{stateName(person.stateId)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(person.registration?.eventIds ?? []).map((eventId) => (
                    <span
                      key={eventId}
                      className={`cubing-icon event-${eventId} text-lg`}
                      title={eventId}
                    />
                  ))}
                </div>
              </TableCell>
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
