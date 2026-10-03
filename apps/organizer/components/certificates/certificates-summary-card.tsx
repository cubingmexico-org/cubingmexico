"use client";

import { formatDistance } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { RefreshCw } from "lucide-react";
import { Competition } from "@/types/wca";
import type {
  ParticipantData,
  RegisteredPerson,
  PodiumData,
} from "@/types/wcif";
import type * as React from "react";
import type { KeyedMutator } from "swr";

export function CertificatesSummaryCard({
  competition,
  isLoadingParticipants,
  isLoadingPodiums,
  lastUpdate,
  mutateParticipants,
  mutatePodiums,
  participantsData,
  persons,
  podiumsData,
  setLastUpdate,
}: {
  competition: Competition;
  isLoadingParticipants: boolean;
  isLoadingPodiums: boolean;
  lastUpdate: Date;
  mutateParticipants: KeyedMutator<ParticipantData[]>;
  mutatePodiums: KeyedMutator<PodiumData[]>;
  participantsData: ParticipantData[] | undefined;
  persons: RegisteredPerson[];
  podiumsData: PodiumData[] | undefined;
  setLastUpdate: React.Dispatch<React.SetStateAction<Date>>;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Estado de los Certificados</CardTitle>
        <CardDescription>
          Información sobre los certificados generados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Certificados de Podio</h4>
              <span className="text-xs text-muted-foreground">
                {Math.ceil((podiumsData?.length ?? 0) / 3)} de{" "}
                {competition.event_ids.length} generados
              </span>
            </div>
            <Progress
              value={
                podiumsData
                  ? (Math.ceil(podiumsData.length / 3) /
                      competition.event_ids.length) *
                    100
                  : 0
              }
              className={`h-2 transition-all ${
                podiumsData &&
                Math.ceil(podiumsData.length / 3) ===
                  competition.event_ids.length
                  ? "*:bg-green-600"
                  : ""
              }`}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Certificados de Participación
              </h4>
              <span className="text-xs text-muted-foreground">
                {participantsData?.length || 0} de {persons.length} generados
              </span>
            </div>
            <Progress
              value={
                participantsData
                  ? (participantsData.length / persons.length) * 100
                  : 0
              }
              className={`h-2 transition-all ${
                participantsData && participantsData.length === persons.length
                  ? "*:bg-green-600"
                  : ""
              }`}
            />
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Última actualización</h4>
              <p className="text-xs text-muted-foreground">
                {formatDistance(lastUpdate, new Date(), {
                  addSuffix: true,
                  locale: es,
                })}
              </p>
            </div>
            <Button
              disabled={isLoadingParticipants || isLoadingPodiums}
              variant="outline"
              size="sm"
              onClick={() => {
                void mutateParticipants();
                void mutatePodiums();
                setLastUpdate(new Date());
              }}
              className="dark:bg-background"
            >
              <RefreshCw />
              Actualizar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
