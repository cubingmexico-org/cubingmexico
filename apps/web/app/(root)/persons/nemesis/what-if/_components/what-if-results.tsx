import Link from "next/link";
import { Swords } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { StateLabel } from "@/components/state-flag";
import type {
  NemesisReport,
  PersonNemesis,
} from "../../../_lib/nemesis-queries";
import { NemesesList } from "../../../_components/nemeses-list";

function NemesisTable({
  targetWcaId,
  nemeses,
  newIds,
}: {
  targetWcaId: string;
  nemeses: PersonNemesis[];
  newIds?: Set<string>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden sm:table-cell">WCA ID</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {nemeses.map((nemesis) => (
          <TableRow key={nemesis.wcaId}>
            <TableCell>
              <Link
                href={`/persons/${nemesis.wcaId}`}
                className="text-link hover:text-link/80"
              >
                {nemesis.name ?? nemesis.wcaId}
              </Link>
              {newIds?.has(nemesis.wcaId) && (
                <Badge variant="destructive" className="ml-2">
                  Nuevo
                </Badge>
              )}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-muted-foreground">
              {nemesis.wcaId}
            </TableCell>
            <TableCell>
              {nemesis.stateName ? (
                <StateLabel
                  stateId={nemesis.stateId}
                  stateName={nemesis.stateName}
                />
              ) : (
                <span className="text-muted-foreground font-thin">N/A</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/persons/compare?a=${targetWcaId}&b=${nemesis.wcaId}`}
                >
                  <Swords className="size-4" />
                  Comparar
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function WhatIfResults({
  targetWcaId,
  targetName,
  baseline,
  hypothetical,
}: {
  targetWcaId: string;
  targetName: string;
  baseline: NemesisReport;
  hypothetical: NemesisReport | null;
}) {
  if (!hypothetical) {
    return (
      <section className="flex flex-col gap-4">
        <p className="text-center text-muted-foreground">
          Cambia algún récord y presiona Simular. Estos son los némesis
          actuales:
        </p>
        <NemesesList
          targetWcaId={targetWcaId}
          targetName={targetName}
          report={baseline}
        />
      </section>
    );
  }

  return (
    <SimulatedResults
      targetWcaId={targetWcaId}
      targetName={targetName}
      baseline={baseline.nemeses}
      hypothetical={hypothetical.nemeses}
    />
  );
}

function SimulatedResults({
  targetWcaId,
  targetName,
  baseline,
  hypothetical,
}: {
  targetWcaId: string;
  targetName: string;
  baseline: PersonNemesis[];
  hypothetical: PersonNemesis[];
}) {
  const baselineIds = new Set(baseline.map((n) => n.wcaId));
  const hypotheticalIds = new Set(hypothetical.map((n) => n.wcaId));
  const newIds = new Set(
    hypothetical.filter((n) => !baselineIds.has(n.wcaId)).map((n) => n.wcaId),
  );
  const removed = baseline.filter((n) => !hypotheticalIds.has(n.wcaId));

  return (
    <section className="flex flex-col gap-6">
      <p className="text-center text-lg">
        <span className="font-semibold">{targetName}</span> pasaría de{" "}
        <span className="font-semibold">{baseline.length}</span> a{" "}
        <span className="font-semibold text-blue-700">
          {hypothetical.length}
        </span>{" "}
        némesis
      </p>

      {hypothetical.length === 0 ? (
        <p className="text-center">
          Nadie en México le superaría en todos sus eventos.
        </p>
      ) : (
        <NemesisTable
          targetWcaId={targetWcaId}
          nemeses={hypothetical}
          newIds={newIds}
        />
      )}

      {removed.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-center text-lg font-semibold">
            Ya no serían sus némesis ({removed.length})
          </h2>
          <NemesisTable targetWcaId={targetWcaId} nemeses={removed} />
        </div>
      )}
    </section>
  );
}
