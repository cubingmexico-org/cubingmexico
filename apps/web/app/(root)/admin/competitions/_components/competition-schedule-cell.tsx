"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
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
  clearCompetitionSchedule,
  getCompetitionRoundDatesForEdit,
  importCompetitionScheduleFromWcif,
  saveCompetitionScheduleManual,
} from "../../_lib/actions";

type RoundRow = {
  eventId: string;
  roundTypeId: string;
  roundName: string;
  endDate: string | null;
  source: "wcif" | "manual" | null;
};

type CompetitionScheduleCellProps = {
  competitionId: string;
  competitionName: string;
  hasResults: boolean;
  hasSchedule: boolean;
  scheduleSource: "wcif" | "manual" | null;
};

export function CompetitionScheduleCell({
  competitionId,
  competitionName,
  hasResults,
  hasSchedule,
  scheduleSource,
}: CompetitionScheduleCellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [rounds, setRounds] = React.useState<RoundRow[]>([]);
  const [source, setSource] = React.useState<"wcif" | "manual" | null>(
    scheduleSource,
  );

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const result = await getCompetitionRoundDatesForEdit({ competitionId });
      if (cancelled) return;
      setLoading(false);

      if (result.error || !result.data) {
        toast.error(result.error ?? "No se pudo cargar el horario");
        return;
      }

      setRounds(result.data.rounds);
      setSource(result.data.source);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, competitionId]);

  function refresh() {
    router.refresh();
  }

  async function onImport(overwrite: boolean) {
    setBusy(true);
    try {
      const result = await importCompetitionScheduleFromWcif({
        competitionId,
        overwrite,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data?.skipped) {
        toast.message("El horario ya existía");
      } else {
        toast.success(
          `Se importaron ${result.data?.count ?? 0} fechas de ronda`,
        );
      }
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveManual() {
    const incomplete = rounds.some((r) => !r.endDate);
    if (incomplete) {
      toast.error("Completa la fecha de cada ronda");
      return;
    }

    setBusy(true);
    try {
      const result = await saveCompetitionScheduleManual({
        competitionId,
        rounds: rounds.map((r) => ({
          eventId: r.eventId,
          roundTypeId: r.roundTypeId,
          endDate: r.endDate!,
        })),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Horario guardado manualmente");
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setBusy(true);
    try {
      const result = await clearCompetitionSchedule({ competitionId });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Horario eliminado");
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  if (!hasResults) {
    return (
      <span className="text-muted-foreground text-xs" title="Sin resultados">
        —
      </span>
    );
  }

  const disabled = busy || loading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Gestionar horario de rondas"
        >
          <CalendarClock className="size-3.5" />
          {hasSchedule ? (
            <span className="text-xs">
              {scheduleSource === "manual" ? "Manual" : "WCIF"}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Sin</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Horario de rondas</DialogTitle>
          <DialogDescription>
            Fechas locales de fin de ronda (9i2) para {competitionName}. Solo
            aplica con resultados ya publicados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Cargando rondas…
          </div>
        ) : (
          <div className="space-y-4">
            {source ? (
              <p className="text-muted-foreground text-xs">
                Fuente actual: {source === "manual" ? "manual" : "WCIF"}
              </p>
            ) : null}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {rounds.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No hay rondas en resultados.
                </p>
              ) : (
                rounds.map((round) => {
                  const key = `${round.eventId}-${round.roundTypeId}`;
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_auto] items-center gap-2"
                    >
                      <Label htmlFor={key} className="text-xs font-normal">
                        <span className="font-mono">{round.eventId}</span>
                        {" · "}
                        {round.roundName}
                      </Label>
                      <Input
                        id={key}
                        type="date"
                        className="h-8 w-36"
                        value={round.endDate ?? ""}
                        disabled={disabled}
                        onChange={(e) => {
                          const value = e.target.value || null;
                          setRounds((prev) =>
                            prev.map((r) =>
                              r.eventId === round.eventId &&
                              r.roundTypeId === round.roundTypeId
                                ? { ...r, endDate: value }
                                : r,
                            ),
                          );
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => void onImport(Boolean(hasSchedule))}
            >
              <Download className="size-3.5" />
              Importar WCIF
            </Button>
            {hasSchedule ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                  >
                    <Trash2 className="size-3.5" />
                    Quitar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Quitar horario?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán las fechas de ronda guardadas. El cálculo de
                      SR volverá a usar la fecha de inicio de la competencia
                      hasta que vuelvas a importar o capturar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void onClear()}>
                      Quitar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={disabled || rounds.length === 0}
            onClick={() => void onSaveManual()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Guardar manual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
