"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  type PendingMollerzRow,
  type PendingNemesisRow,
  type PendingRecordRow,
  type PendingResultadosRow,
  type PendingStreaksMonthlyRow,
  type PendingSummaryUnlockRow,
  type PendingUpcomingRow,
  type PendingWeeklyDigestRow,
  type PendingYearRecapRow,
  type PreviewTarget,
} from "./social-types";
import { PendingPostsCard } from "./pending-posts-card";

export function PendingPostsTab({
  includeOlder,
  pendingResultados,
  pendingRecords,
  pendingUpcoming,
  pendingSummaryUnlock,
  pendingWeeklyDigest,
  pendingStreaksMonthly,
  pendingYearRecap,
  pendingMollerz,
  pendingNemesis,
  busyKey,
  setPreviewTarget,
}: {
  includeOlder: boolean;
  pendingResultados: PendingResultadosRow[];
  pendingRecords: PendingRecordRow[];
  pendingUpcoming: PendingUpcomingRow[];
  pendingSummaryUnlock: PendingSummaryUnlockRow[];
  pendingWeeklyDigest: PendingWeeklyDigestRow[];
  pendingStreaksMonthly: PendingStreaksMonthlyRow[];
  pendingYearRecap: PendingYearRecapRow[];
  pendingMollerz: PendingMollerzRow[];
  pendingNemesis: PendingNemesisRow[];
  busyKey: string | null;
  setPreviewTarget: React.Dispatch<React.SetStateAction<PreviewTarget | null>>;
}) {
  const router = useRouter();
  const cardProps = { busyKey, onPreview: setPreviewTarget };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium">Pendientes recientes</p>
          <p className="text-muted-foreground text-sm">
            RESULTADOS y RÉCORDS por defecto de la última semana.
          </p>
        </div>
        <div className="w-full space-y-2 sm:w-56">
          <Label htmlFor="social-age-filter">Antigüedad</Label>
          <Select
            value={includeOlder ? "all" : "week"}
            onValueChange={(value) => {
              const params = new URLSearchParams();
              if (value === "all") {
                params.set("older", "1");
              }
              const query = params.toString();
              router.push(query ? `/admin/social?${query}` : "/admin/social");
            }}
          >
            <SelectTrigger id="social-age-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · RESULTADOS"
        description={
          <>
            Competencias MX con resultados sin Facebook y/o Instagram
            {includeOlder ? "." : " (última semana)."}
          </>
        }
        emptyMessage={
          includeOlder
            ? "No hay RESULTADOS pendientes."
            : "No hay RESULTADOS pendientes de la última semana."
        }
        subjectHeader="Competencia"
        rows={pendingResultados}
        postType="resultados"
        renderSubject={(row) => ({
          title: row.name,
          detail: (
            <>
              {row.cityName} · {row.id}
            </>
          ),
        })}
        previewName={(row) => row.name}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · RÉCORDS"
        description={
          <>
            NR / NAR / WR sin publicar en alguna plataforma
            {includeOlder ? "." : " (última semana)."}
          </>
        }
        emptyMessage={
          includeOlder
            ? "No hay RÉCORDS pendientes."
            : "No hay RÉCORDS pendientes de la última semana."
        }
        subjectHeader="Récord"
        rows={pendingRecords}
        postType="record"
        renderSubject={(row) => ({
          title: (
            <>
              {row.level} · {row.personName}
            </>
          ),
          detail: (
            <>
              {row.stateName ? `${row.stateName} · ` : null}
              {row.eventName} ({row.kind})
              {row.competitionName ? ` · ${row.competitionName}` : ""}
            </>
          ),
        })}
        previewName={(row) => `${row.level} ${row.personName}`}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · MOLLERZ"
        description="Nuevos miembros Mollerz y subidas de nivel sin publicar en alguna plataforma."
        emptyMessage="No hay MOLLERZ pendientes."
        subjectHeader="Miembro"
        rows={pendingMollerz}
        postType="mollerz"
        renderSubject={(row) => ({
          title: (
            <>
              {row.tier} · {row.personName}
            </>
          ),
          detail: (
            <>
              {row.stateName ? `${row.stateName} · ` : null}
              {row.isNewMember ? "Nuevo miembro" : "Subida de nivel"} ·{" "}
              {row.personId}
            </>
          ),
        })}
        previewName={(row) => `${row.tier} ${row.personName}`}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · NÉMESIS"
        description="Competidores que se quedaron sin némesis y aún no se publican en alguna plataforma."
        emptyMessage="No hay NÉMESIS pendientes."
        subjectHeader="Competidor"
        rows={pendingNemesis}
        postType="nemesis"
        renderSubject={(row) => ({
          title: row.personName,
          detail: (
            <>
              {row.stateName ? `${row.stateName} · ` : null}
              {row.eventCount} eventos · némesis de{" "}
              {row.nemesizedCount.toLocaleString("es-MX")} · {row.personId}
            </>
          ),
        })}
        previewName={(row) => `Sin némesis ${row.personName}`}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · PRÓXIMAS"
        description="Competencias MX futuras aún no anunciadas en redes."
        emptyMessage="No hay PRÓXIMAS pendientes."
        subjectHeader="Competencia"
        rows={pendingUpcoming}
        postType="upcoming"
        renderSubject={(row) => ({
          title: row.name,
          detail: (
            <>
              {new Date(row.startDate).toLocaleDateString("es-MX")} ·{" "}
              {row.cityName}
              {row.stateName ? ` · ${row.stateName}` : ""}
            </>
          ),
        })}
        previewName={(row) => row.name}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · SEMANA"
        description="Digest semanal (lunes México). Recap de competencias W−2 + resultados que llegaron en W−1; lookahead 14 días. SRs solo agregados."
        emptyMessage="No hay SEMANA pendiente (ya publicada en ambas plataformas)."
        subjectHeader="Semana"
        rows={pendingWeeklyDigest}
        postType="weekly_digest"
        renderSubject={(row) => ({
          title: `Semana ${row.weekKey}`,
          detail: "Recap con lag W−2",
        })}
        previewName={(row) => `Semana ${row.weekKey}`}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · RACHAS"
        description="Spotlight mensual de rachas de PRs (último día del mes, México; reintento hasta 3 días después si falla el cron)."
        emptyMessage="No hay RACHAS pendiente (ya publicada en ambas plataformas)."
        subjectHeader="Mes"
        rows={pendingStreaksMonthly}
        postType="streaks_monthly"
        renderSubject={(row) => ({
          title: `Rachas ${row.monthKey}`,
          detail: "Top rachas actuales",
        })}
        previewName={(row) => `Rachas ${row.monthKey}`}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · RESUMEN"
        description="Anuncio de desbloqueo de resúmenes anuales personales y de team (desde el 20 de diciembre UTC)."
        emptyMessage="No hay RESUMEN pendiente (aún no desbloqueado o ya publicado)."
        subjectHeader="Año"
        rows={pendingSummaryUnlock}
        postType="summary_unlock"
        renderSubject={(row) => ({
          title: `Resumen anual ${row.year}`,
          detail: "Personal y team",
        })}
        previewName={(row) => `Resumen anual ${row.year}`}
      />

      <PendingPostsCard
        {...cardProps}
        title="Pendientes · AÑO"
        description="Carrusel con el año en números y felicitación de año nuevo. Se publica el 31 de diciembre (México), con reintento hasta el 2 de enero; vista previa desde el 20 de diciembre."
        emptyMessage="No hay AÑO pendiente (fuera de temporada o ya publicado)."
        subjectHeader="Año"
        rows={pendingYearRecap}
        postType="year_recap"
        renderSubject={(row) => ({
          title: `Año ${row.year}`,
          detail: `Recap nacional + ¡Feliz ${row.year + 1}!`,
        })}
        previewName={(row) => `Año ${row.year}`}
      />
    </>
  );
}
