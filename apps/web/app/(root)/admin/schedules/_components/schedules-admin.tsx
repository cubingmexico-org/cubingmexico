"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { CompetitionScheduleCell } from "../../competitions/_components/competition-schedule-cell";
import { lookupCompetitionForSchedule } from "../../_lib/actions";

type MissingScheduleRow = {
  id: string;
  name: string;
  cityName: string;
  countryId: string;
  startDate: Date;
  hasResults: boolean;
  hasSchedule: boolean;
  scheduleSource: "wcif" | "manual" | null;
};

export function SchedulesSearch({ search }: { search: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState(search);

  return (
    <form
      className="flex max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (localSearch.trim()) {
          params.set("q", localSearch.trim());
        } else {
          params.delete("q");
        }
        router.push(`/admin/schedules?${params.toString()}`);
      }}
    >
      <Input
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
        placeholder="Nombre, ID o ciudad"
      />
      <Button type="submit" variant="outline" size="sm">
        Ir
      </Button>
    </form>
  );
}

export function LookupScheduleById() {
  const [competitionId, setCompetitionId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [found, setFound] = React.useState<{
    id: string;
    name: string;
    countryId: string;
    hasResults: boolean;
    hasSchedule: boolean;
    scheduleSource: "wcif" | "manual" | null;
  } | null>(null);

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    const id = competitionId.trim();
    if (!id) return;

    setPending(true);
    try {
      const result = await lookupCompetitionForSchedule({
        competitionId: id,
      });
      if (result.error || !result.data) {
        setFound(null);
        toast.error(result.error ?? "Competencia no encontrada");
        return;
      }
      setFound(result.data);
    } catch (err) {
      setFound(null);
      toast.error(err instanceof Error ? err.message : "Error al buscar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <form
        className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={onLookup}
      >
        <div className="flex-1 space-y-2">
          <Label htmlFor="schedule-comp-id">Editar por ID</Label>
          <Input
            id="schedule-comp-id"
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            placeholder="WC2025"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Buscando..." : "Abrir"}
        </Button>
      </form>
      {found ? (
        <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
          <div>
            <p className="font-medium">{found.name}</p>
            <p className="text-muted-foreground font-mono text-xs">
              {found.id} · {found.countryId}
            </p>
          </div>
          <CompetitionScheduleCell
            competitionId={found.id}
            competitionName={found.name}
            hasResults={found.hasResults}
            hasSchedule={found.hasSchedule}
            scheduleSource={found.scheduleSource}
          />
        </div>
      ) : null}
    </div>
  );
}

export function MissingSchedulesTable({
  competitions,
}: {
  competitions: MissingScheduleRow[];
}) {
  if (competitions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay competencias pendientes de horario.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competencia</TableHead>
            <TableHead>País</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-28">Horario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competitions.map((comp) => (
            <TableRow key={comp.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{comp.name}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {comp.id}
                  </p>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {comp.countryId}
              </TableCell>
              <TableCell>{comp.cityName}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {new Date(comp.startDate).toLocaleDateString("es-MX", {
                  timeZone: "UTC",
                })}
              </TableCell>
              <TableCell>
                <CompetitionScheduleCell
                  competitionId={comp.id}
                  competitionName={comp.name}
                  hasResults={comp.hasResults}
                  hasSchedule={comp.hasSchedule}
                  scheduleSource={comp.scheduleSource}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
