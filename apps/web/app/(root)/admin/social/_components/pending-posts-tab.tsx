"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
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
import { PreviewButton, missingPlatformBadges } from "./social-ui";

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · RESULTADOS</CardTitle>
          <CardDescription>
            Competencias MX con resultados sin Facebook y/o Instagram
            {includeOlder ? "." : " (última semana)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingResultados.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {includeOlder
                ? "No hay RESULTADOS pendientes."
                : "No hay RESULTADOS pendientes de la última semana."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competencia</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingResultados.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">{row.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {row.cityName} · {row.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="resultados"
                            subjectKey={row.subjectKey}
                            name={row.name}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · RÉCORDS</CardTitle>
          <CardDescription>
            NR / NAR / WR sin publicar en alguna plataforma
            {includeOlder ? "." : " (última semana)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRecords.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {includeOlder
                ? "No hay RÉCORDS pendientes."
                : "No hay RÉCORDS pendientes de la última semana."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Récord</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRecords.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {row.level} · {row.personName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {row.stateName ? `${row.stateName} · ` : null}
                              {row.eventName} ({row.kind})
                              {row.competitionName
                                ? ` · ${row.competitionName}`
                                : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="record"
                            subjectKey={row.subjectKey}
                            name={`${row.level} ${row.personName}`}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · MOLLERZ</CardTitle>
          <CardDescription>
            Nuevos miembros Mollerz y subidas de nivel sin publicar en alguna
            plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingMollerz.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay MOLLERZ pendientes.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMollerz.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              {row.tier} · {row.personName}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {row.stateName ? `${row.stateName} · ` : null}
                              {row.isNewMember
                                ? "Nuevo miembro"
                                : "Subida de nivel"}{" "}
                              · {row.personId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="mollerz"
                            subjectKey={row.subjectKey}
                            name={`${row.tier} ${row.personName}`}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · NÉMESIS</CardTitle>
          <CardDescription>
            Competidores que se quedaron sin némesis y aún no se publican en
            alguna plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingNemesis.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay NÉMESIS pendientes.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competidor</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingNemesis.map((row) => (
                    <TableRow key={row.subjectKey}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{row.personName}</p>
                          <p className="text-muted-foreground text-xs">
                            {row.stateName ? `${row.stateName} · ` : null}
                            {row.eventCount} eventos · némesis de{" "}
                            {row.nemesizedCount.toLocaleString("es-MX")} ·{" "}
                            {row.personId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{missingPlatformBadges(row)}</TableCell>
                      <TableCell className="text-right">
                        <PreviewButton
                          postType="nemesis"
                          subjectKey={row.subjectKey}
                          name={`Sin némesis ${row.personName}`}
                          disabled={busyKey !== null}
                          onPreview={setPreviewTarget}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · PRÓXIMAS</CardTitle>
          <CardDescription>
            Competencias MX futuras aún no anunciadas en redes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUpcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay PRÓXIMAS pendientes.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competencia</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUpcoming.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">{row.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(row.startDate).toLocaleDateString(
                                "es-MX",
                              )}{" "}
                              · {row.cityName}
                              {row.stateName ? ` · ${row.stateName}` : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="upcoming"
                            subjectKey={row.subjectKey}
                            name={row.name}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · SEMANA</CardTitle>
          <CardDescription>
            Digest semanal (lunes México). Recap de competencias W−2 +
            resultados que llegaron en W−1; lookahead 14 días. SRs solo
            agregados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingWeeklyDigest.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay SEMANA pendiente (ya publicada en ambas plataformas).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Semana</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWeeklyDigest.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">Semana {row.weekKey}</p>
                            <p className="text-muted-foreground text-xs">
                              Recap con lag W−2
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="weekly_digest"
                            subjectKey={row.subjectKey}
                            name={`Semana ${row.weekKey}`}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · RACHAS</CardTitle>
          <CardDescription>
            Spotlight mensual de rachas de PRs (último día del mes, México;
            reintento hasta 3 días después si falla el cron).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingStreaksMonthly.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay RACHAS pendiente (ya publicada en ambas plataformas).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingStreaksMonthly.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">Rachas {row.monthKey}</p>
                            <p className="text-muted-foreground text-xs">
                              Top rachas actuales
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="streaks_monthly"
                            subjectKey={row.subjectKey}
                            name={`Rachas ${row.monthKey}`}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · RESUMEN</CardTitle>
          <CardDescription>
            Anuncio de desbloqueo de resúmenes anuales personales y de team
            (desde el 20 de diciembre UTC).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingSummaryUnlock.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay RESUMEN pendiente (aún no desbloqueado o ya publicado).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSummaryUnlock.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              Resumen anual {row.year}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Personal y team
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="summary_unlock"
                            subjectKey={row.subjectKey}
                            name={`Resumen anual ${row.year}`}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes · AÑO</CardTitle>
          <CardDescription>
            Carrusel con el año en números y felicitación de año nuevo. Se
            publica el 31 de diciembre (México), con reintento hasta el 2 de
            enero; vista previa desde el 20 de diciembre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingYearRecap.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay AÑO pendiente (fuera de temporada o ya publicado).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Falta</TableHead>
                    <TableHead className="text-right">Vista previa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingYearRecap.map((row) => {
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">Año {row.year}</p>
                            <p className="text-muted-foreground text-xs">
                              Recap nacional + ¡Feliz {row.year + 1}!
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PreviewButton
                            postType="year_recap"
                            subjectKey={row.subjectKey}
                            name={`Año ${row.year}`}
                            disabled={busyKey !== null}
                            onPreview={setPreviewTarget}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
