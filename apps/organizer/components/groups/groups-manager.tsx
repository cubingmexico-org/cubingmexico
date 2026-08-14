"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
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
import type { Competition } from "@/types/wca";
import type { WCIF } from "@/types/wcif";
import { useGroupsStore } from "@/lib/groups/groups-store";
import { roundIdToActivityCode } from "@/lib/groups/wcif-schedule";
import { isCompetitionToolsUnavailable } from "@/lib/competition-availability";
import { pushGroupsWcif } from "@/app/actions";
import { RoundSelector } from "@/components/groups/round-selector";
import { GroupConfigPanel } from "@/components/groups/group-config-panel";
import { AssignmentsPanel } from "@/components/groups/assignments-panel";
import { DayOfPanel } from "@/components/groups/day-of-panel";
import { ImportCsvPanel } from "@/components/groups/import-csv-panel";
import { PrintablesPanel } from "@/components/groups/printables-panel";
import { CompetitionConfigPanel } from "@/components/groups/competition-config-panel";
import { StaffRolesPanel } from "@/components/groups/staff-roles-panel";
import { RoundsOverviewPanel } from "@/components/groups/rounds-overview-panel";

export function GroupsManager({
  competition,
  wcif,
  competitionLogoUrl,
}: {
  competition: Competition;
  wcif: WCIF;
  competitionLogoUrl?: string | null;
}) {
  const router = useRouter();
  const [pushError, setPushError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mainTab, setMainTab] = useState("overview");

  const {
    draftWcif,
    isDirty,
    selectedRoundId,
    load,
    replaceDraft,
    resetAll,
    markClean,
    setSelectedRoundId,
  } = useGroupsStore();

  useEffect(() => {
    load(wcif);
  }, [wcif, load]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  if (!draftWcif) {
    return null;
  }

  const roundActivityCode = selectedRoundId
    ? roundIdToActivityCode(selectedRoundId)
    : null;

  const canPush =
    isDirty &&
    !isCompetitionToolsUnavailable(competition) &&
    !competition.results_posted_at;

  const handlePush = () => {
    setPushError(null);
    startTransition(async () => {
      const result = await pushGroupsWcif(competition.id, draftWcif);
      if (!result.ok) {
        setPushError(result.error);
        toast.error("Error al publicar en WCA", {
          description: result.error.slice(0, 200),
        });
        return;
      }
      markClean();
      toast.success("Grupos publicados en WCA");
      router.refresh();
    });
  };

  const handleSelectRound = (roundId: string) => {
    setSelectedRoundId(roundId);
    setMainTab("round");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {competition.name}
          </h1>
          <p className="text-muted-foreground">
            Grupos — borrador local; publica en WCA cuando esté listo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetAll();
                toast.message("Cambios descartados");
              }}
            >
              Descartar cambios
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={!canPush || isPending}>
                <Upload className="size-4" />
                {isPending ? "Publicando…" : "Publicar en WCA"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Publicar grupos en WCA?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se validará el WCIF (check) y luego se enviará un PATCH con
                  asignaciones y grupos (child activities). Esta acción modifica
                  la competencia en el sitio de la WCA.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handlePush}>
                  Publicar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isDirty && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Cambios locales — no guardados en WCA</AlertTitle>
          <AlertDescription>
            Las asignaciones viven en este navegador hasta que publiques.
            Exporta CSV/JSON si necesitas un respaldo.
          </AlertDescription>
        </Alert>
      )}

      {competition.results_posted_at && (
        <Alert>
          <AlertTitle>Publicación deshabilitada</AlertTitle>
          <AlertDescription>
            Los resultados ya fueron publicados; WCA no permite editar el WCIF a
            organizadores.
          </AlertDescription>
        </Alert>
      )}

      {pushError && (
        <Alert variant="destructive">
          <AlertTitle>Error al publicar</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap font-mono text-xs">
            {pushError}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="round">Ronda</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <RoundsOverviewPanel
            wcif={draftWcif}
            selectedRoundId={selectedRoundId}
            onSelectRound={handleSelectRound}
            onApply={replaceDraft}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <CompetitionConfigPanel
            wcif={draftWcif}
            competitionImageUrl={competitionLogoUrl}
            onApply={replaceDraft}
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-4">
          <StaffRolesPanel wcif={draftWcif} onApply={replaceDraft} />
        </TabsContent>

        <TabsContent value="round" className="mt-4 space-y-4">
          <RoundSelector
            wcif={draftWcif}
            selectedRoundId={selectedRoundId}
            onSelect={setSelectedRoundId}
          />

          {roundActivityCode ? (
            <Tabs defaultValue="groups">
              <TabsList>
                <TabsTrigger value="groups">Grupos</TabsTrigger>
                <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
                <TabsTrigger value="day-of">Día de</TabsTrigger>
                <TabsTrigger value="import">Importar</TabsTrigger>
                <TabsTrigger value="printables">Imprimibles</TabsTrigger>
              </TabsList>
              <TabsContent value="groups" className="mt-4">
                <GroupConfigPanel
                  wcif={draftWcif}
                  roundActivityCode={roundActivityCode}
                  onApply={replaceDraft}
                />
              </TabsContent>
              <TabsContent value="assignments" className="mt-4">
                <AssignmentsPanel
                  wcif={draftWcif}
                  roundActivityCode={roundActivityCode}
                  competitionId={competition.id}
                  onApply={replaceDraft}
                />
              </TabsContent>
              <TabsContent value="day-of" className="mt-4">
                <DayOfPanel
                  wcif={draftWcif}
                  roundActivityCode={roundActivityCode}
                />
              </TabsContent>
              <TabsContent value="import" className="mt-4">
                <ImportCsvPanel wcif={draftWcif} onApply={replaceDraft} />
              </TabsContent>
              <TabsContent value="printables" className="mt-4">
                <PrintablesPanel
                  wcif={draftWcif}
                  roundActivityCode={roundActivityCode}
                  competitionImageUrl={competitionLogoUrl}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecciona una ronda desde Resumen o el selector superior.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
