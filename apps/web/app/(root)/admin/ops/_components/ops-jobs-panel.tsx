"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ADMIN_OPS_JOBS, type AdminOpsPath } from "../../_lib/ops-jobs";

export function OpsJobsPanel() {
  const [pendingPath, setPendingPath] = React.useState<AdminOpsPath | null>(
    null,
  );

  async function runJob(path: AdminOpsPath) {
    setPendingPath(path);
    try {
      const response = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        const message =
          data?.message ||
          data?.data?.error ||
          data?.data?.message ||
          `Error HTTP ${response.status}`;
        toast.error(String(message));
        return;
      }

      toast.success(`Job ${path} completado`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al ejecutar el job",
      );
    } finally {
      setPendingPath(null);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Estos jobs pueden tardar varios minutos. No cierres la pestaña hasta
        recibir una respuesta.
      </p>
      {ADMIN_OPS_JOBS.map((job) => (
        <Card key={job.path}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{job.label}</CardTitle>
            <CardDescription>{job.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <code className="text-muted-foreground text-xs">{job.path}</code>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={pendingPath !== null}>
                  {pendingPath === job.path ? "Ejecutando..." : "Ejecutar"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Ejecutar {job.label}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se enviará un POST a {job.path} en el backend Flask. El
                    proceso puede tardar varios minutos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void runJob(job.path);
                    }}
                  >
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
