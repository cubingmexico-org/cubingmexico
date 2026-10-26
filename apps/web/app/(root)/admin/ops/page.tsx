import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { getExportMetadata, getRecentJobRuns } from "../_lib/queries";
import { OpsJobsPanel } from "./_components/ops-jobs-panel";

const JOB_RUN_STATUS_LABELS = {
  running: "En curso",
  succeeded: "Completada",
  failed: "Fallida",
} as const;

function formatDuration(startedAt: Date, finishedAt: Date | null): string {
  if (!finishedAt) return "—";
  const seconds = Math.round(
    (finishedAt.getTime() - startedAt.getTime()) / 1000,
  );
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
}

async function OpsJobRuns() {
  const runs = await getRecentJobRuns();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ejecuciones recientes</CardTitle>
        <CardDescription>
          Progreso de “Actualizar todo”, guardado en `job_runs`
        </CardDescription>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin ejecuciones.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Paso fallido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => {
                const failedStep = run.steps.find(
                  (step) => step.status === "failed",
                );
                return (
                  <TableRow key={run.id}>
                    <TableCell className="whitespace-nowrap">
                      {run.startedAt.toLocaleString("es-MX")}
                      {run.resumedFrom ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (reanudada)
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          run.status === "failed" ? "destructive" : "secondary"
                        }
                      >
                        {JOB_RUN_STATUS_LABELS[run.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {failedStep ? (
                        <>
                          <span className="font-medium">{failedStep.name}</span>
                          {failedStep.error ? (
                            <span className="text-muted-foreground block break-all text-xs">
                              {failedStep.error}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        (run.error ?? "—")
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function OpsExportMetadata() {
  const metadata = await getExportMetadata();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estado del export</CardTitle>
        <CardDescription>Valores actuales en `export_metadata`</CardDescription>
      </CardHeader>
      <CardContent>
        {metadata.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin datos.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {metadata.map((row) => (
              <li
                key={row.key}
                className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.key}</p>
                  <p className="text-muted-foreground break-all text-sm">
                    {row.value ?? "—"}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs whitespace-nowrap">
                  {row.updatedAt
                    ? new Date(row.updatedAt).toLocaleString("es-MX")
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminOpsPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <OpsExportMetadata />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
        <OpsJobRuns />
      </Suspense>
      <OpsJobsPanel />
    </div>
  );
}
