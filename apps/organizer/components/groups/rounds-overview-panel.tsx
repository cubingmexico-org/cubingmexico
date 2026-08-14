"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Eraser, Layers, Shuffle, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
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
import type { WCIF } from "@/types/wcif";
import {
  assignAllPendingRounds,
  clearAllRoundAssignments,
  createMissingGroupsForAllRounds,
} from "@/lib/groups/generate-assignments";
import {
  buildRoundsOverview,
  statusLabel,
  type RoundStatus,
} from "@/lib/groups/overview";
import { ensureDefaultRoomStations } from "@/lib/groups/config";

function statusVariant(
  status: RoundStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ready":
      return "default";
    case "conflicts":
      return "destructive";
    case "no_assignments":
      return "secondary";
    default:
      return "outline";
  }
}

export function RoundsOverviewPanel({
  wcif,
  selectedRoundId,
  onSelectRound,
  onApply,
}: {
  wcif: WCIF;
  selectedRoundId: string | null;
  onSelectRound: (roundId: string) => void;
  onApply: (next: WCIF) => void;
}) {
  const overview = useMemo(() => buildRoundsOverview(wcif), [wcif]);

  const handleCreateMissing = () => {
    const seeded = ensureDefaultRoomStations(wcif);
    const { wcif: next, created } = createMissingGroupsForAllRounds(seeded);
    onApply(next);
    if (created.length === 0) {
      toast.message("No había rondas sin grupos");
    } else {
      toast.success(`Grupos creados en ${created.length} ronda(s)`);
    }
  };

  const handleAssignAll = () => {
    const seeded = ensureDefaultRoomStations(wcif);
    const result = assignAllPendingRounds(seeded);
    onApply(result.wcif);
    if (result.assignedRounds.length === 0 && result.errors.length === 0) {
      toast.message("No había rondas pendientes");
      return;
    }
    if (result.errors.length > 0) {
      toast.warning(
        `Asignadas ${result.assignedRounds.length}; ${result.errors.length} con error`,
        {
          description: result.errors
            .slice(0, 3)
            .map((e) => `${e.roundId}: ${e.message}`)
            .join(" · "),
        },
      );
    } else {
      toast.success(
        `Asignadas ${result.assignedRounds.length} ronda(s)` +
          (result.createdGroupsFor.length
            ? ` (grupos nuevos: ${result.createdGroupsFor.length})`
            : ""),
      );
    }
  };

  const handleClearAll = () => {
    onApply(clearAllRoundAssignments(wcif));
    toast.success("Asignaciones de todas las rondas limpiadas");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleCreateMissing}>
          <Layers className="size-4" />
          Crear grupos faltantes
        </Button>
        <Button type="button" onClick={handleAssignAll}>
          <Shuffle className="size-4" />
          Asignar todo
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline">
              <Eraser className="size-4" />
              Limpiar asignaciones
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ¿Limpiar todas las asignaciones?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminan asignaciones de competidor y staff en todos los
                grupos. Los grupos (actividades hijas) se conservan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll}>
                Limpiar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-sm text-muted-foreground">
        Vista de competencia: elige una ronda para editar detalle. Usa{" "}
        <strong>Asignar todo</strong> para crear grupos sugeridos y asignar
        competidores + staff de una vez.
      </p>

      <Accordion
        type="multiple"
        defaultValue={overview.map((e) => e.eventId)}
        className="rounded-lg border px-3"
      >
        {overview.map((event) => (
          <AccordionItem key={event.eventId} value={event.eventId}>
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                {event.eventName}
                <Badge variant="secondary" className="font-normal">
                  {event.rounds.length} ronda
                  {event.rounds.length === 1 ? "" : "s"}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-1 pb-2">
                {event.rounds.map((round) => {
                  const selected = selectedRoundId === round.roundId;
                  return (
                    <button
                      key={round.roundId}
                      type="button"
                      onClick={() => onSelectRound(round.roundId)}
                      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="grow min-w-0">
                        <div className="font-medium">
                          Ronda {round.roundNumber}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {round.competitors} inscritos ·{" "}
                          {round.groupCount > 0
                            ? `${round.groupCount} grupos`
                            : `sugerido ${round.suggestedGroups}`}
                          {round.stations > 0
                            ? ` · ${round.stations} est.`
                            : ""}
                          {round.conflictCount > 0
                            ? ` · ${round.conflictCount} conflictos`
                            : ""}
                        </div>
                      </div>
                      <Badge variant={statusVariant(round.status)}>
                        {statusLabel(round.status)}
                      </Badge>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
