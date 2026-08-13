"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import type { Competition } from "@/types/wca";
import type { WCIF } from "@/types/wcif";
import { useGroupsStore } from "@/lib/groups/groups-store";
import { roundIdToActivityCode } from "@/lib/groups/wcif-schedule";
import { RoundSelector } from "@/components/groups/round-selector";
import { GroupConfigPanel } from "@/components/groups/group-config-panel";
import { AssignmentsPanel } from "@/components/groups/assignments-panel";

export function GroupsManager({
  competition,
  wcif,
}: {
  competition: Competition;
  wcif: WCIF;
}) {
  const {
    draftWcif,
    isDirty,
    selectedRoundId,
    load,
    replaceDraft,
    resetAll,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {competition.name}
          </h1>
          <p className="text-muted-foreground">
            Grupos — borrador local (sin escritura a WCA)
          </p>
        </div>
        {isDirty && (
          <Button type="button" variant="outline" onClick={resetAll}>
            Descartar cambios
          </Button>
        )}
      </div>

      {isDirty && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Cambios locales — no guardados en WCA</AlertTitle>
          <AlertDescription>
            Las asignaciones viven solo en este navegador hasta la fase de
            escritura WCIF. Exporta CSV/JSON si necesitas conservar el trabajo.
          </AlertDescription>
        </Alert>
      )}

      <RoundSelector
        wcif={draftWcif}
        selectedRoundId={selectedRoundId}
        onSelect={setSelectedRoundId}
      />

      {roundActivityCode && (
        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
            <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
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
        </Tabs>
      )}
    </div>
  );
}
