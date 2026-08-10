"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { updateCompetitionState } from "../../_lib/actions";

type StateOption = { id: string; name: string };

type CompetitionRow = {
  id: string;
  name: string;
  cityName: string;
  startDate: Date;
  stateId: string | null;
  stateName: string | null;
};

export function CompetitionsFilters({
  states,
  missingOnly,
  stateId,
  search,
}: {
  states: StateOption[];
  missingOnly: boolean;
  stateId: string | null;
  search: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = React.useState(search);

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`/admin/competitions?${params.toString()}`);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="comp-search">Buscar</Label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateParams((params) => {
              if (localSearch.trim()) {
                params.set("q", localSearch.trim());
              } else {
                params.delete("q");
              }
            });
          }}
        >
          <Input
            id="comp-search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Nombre, ID o ciudad"
          />
          <Button type="submit" variant="outline" size="sm">
            Ir
          </Button>
        </form>
      </div>
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select
          value={stateId ?? "all"}
          onValueChange={(value) => {
            updateParams((params) => {
              if (value === "all") {
                params.delete("stateId");
              } else {
                params.set("stateId", value);
              }
              params.delete("missing");
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {states.map((state) => (
              <SelectItem key={state.id} value={state.id}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Filtro</Label>
        <Select
          value={missingOnly ? "missing" : "all"}
          onValueChange={(value) => {
            updateParams((params) => {
              if (value === "missing") {
                params.set("missing", "1");
                params.delete("stateId");
              } else {
                params.delete("missing");
              }
            });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las MX</SelectItem>
            <SelectItem value="missing">Sin estado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function CompetitionsTable({
  competitions,
  states,
}: {
  competitions: CompetitionRow[];
  states: StateOption[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function onStateChange(competitionId: string, value: string) {
    setPendingId(competitionId);
    const result = await updateCompetitionState({
      competitionId,
      stateId: value === "none" ? null : value,
    });
    setPendingId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Estado de competencia actualizado");
    router.refresh();
  }

  if (competitions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No se encontraron competencias.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Competencia</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-[200px]">Estado</TableHead>
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
              <TableCell>{comp.cityName}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {new Date(comp.startDate).toLocaleDateString("es-MX")}
              </TableCell>
              <TableCell>
                <Select
                  value={comp.stateId ?? "none"}
                  disabled={pendingId === comp.id}
                  onValueChange={(value) => void onStateChange(comp.id, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin estado</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
