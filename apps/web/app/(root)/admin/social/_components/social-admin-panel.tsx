"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCheck,
  ClipboardCopy,
  Download,
  Eye,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "@icons-pack/react-simple-icons";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Stat,
  StatDescription,
  StatLabel,
  StatValue,
} from "@workspace/ui/components/stat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@workspace/ui/components/alert-dialog";

export type SocialPostType =
  | "resultados"
  | "record"
  | "upcoming"
  | "summary_unlock"
  | "weekly_digest"
  | "streaks_monthly";

export type PendingResultadosRow = {
  id: string;
  subjectKey: string;
  name: string;
  cityName: string;
  endDate: Date | string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingRecordRow = {
  subjectKey: string;
  personId: string;
  personName: string;
  stateName: string | null;
  eventName: string;
  eventId: string;
  kind: string;
  level: string;
  value: number;
  competitionId: string | null;
  competitionName: string | null;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingUpcomingRow = {
  id: string;
  subjectKey: string;
  name: string;
  cityName: string;
  startDate: Date | string;
  stateName: string | null;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingSummaryUnlockRow = {
  subjectKey: string;
  year: number;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingWeeklyDigestRow = {
  subjectKey: string;
  weekKey: string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type PendingStreaksMonthlyRow = {
  subjectKey: string;
  monthKey: string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type SocialPostRow = {
  id: string;
  postType: string;
  subjectKey: string;
  competitionId: string | null;
  competitionName: string | null;
  cityName: string | null;
  platform: string;
  externalId: string | null;
  postedAt: Date | string | null;
};

export type SocialPostStats = {
  total: number;
  competitions: number;
  facebook: number;
  instagram: number;
  resultados: number;
  records: number;
  upcoming: number;
  summaryUnlock: number;
  weeklyDigest: number;
  streaksMonthly: number;
};

function platformLabel(platform: string) {
  if (platform === "facebook") return "Facebook";
  if (platform === "instagram") return "Instagram";
  return platform;
}

function PlatformIcon({
  platform,
  className = "size-3.5",
}: {
  platform: string;
  className?: string;
}) {
  if (platform === "facebook") return <SiFacebook className={className} />;
  if (platform === "instagram") return <SiInstagram className={className} />;
  return null;
}

function postTypeLabel(postType: string) {
  if (postType === "resultados") return "RESULTADOS";
  if (postType === "record") return "RÉCORD";
  if (postType === "upcoming") return "PRÓXIMA";
  if (postType === "summary_unlock") return "RESUMEN";
  if (postType === "weekly_digest") return "SEMANA";
  if (postType === "streaks_monthly") return "RACHAS";
  return postType;
}

function apiBase(postType: SocialPostType) {
  if (postType === "resultados") return "/api/admin/social/resultados";
  if (postType === "record") return "/api/admin/social/records";
  if (postType === "summary_unlock") return "/api/admin/social/summary-unlock";
  if (postType === "weekly_digest") return "/api/admin/social/weekly-digest";
  if (postType === "streaks_monthly") return "/api/admin/social/streaks-monthly";
  return "/api/admin/social/upcoming";
}

function missingPlatformBadges(row: {
  facebookPosted: boolean;
  instagramPosted: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {!row.facebookPosted ? (
        <Badge variant="outline" className="gap-1">
          <SiFacebook className="size-3" />
          Facebook
        </Badge>
      ) : null}
      {!row.instagramPosted ? (
        <Badge variant="outline" className="gap-1">
          <SiInstagram className="size-3" />
          Instagram
        </Badge>
      ) : null}
    </div>
  );
}

async function downloadImage(postType: SocialPostType, subjectKey: string) {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/image`,
  );
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message || data?.data?.message || data?.data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(String(message));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const prefix =
    postType === "resultados"
      ? "resultados"
      : postType === "record"
        ? "record"
        : postType === "summary_unlock"
          ? "resumen"
          : postType === "weekly_digest"
            ? "semana"
            : postType === "streaks_monthly"
              ? "rachas"
              : "proxima";
  a.download = `${prefix}-${subjectKey.replace(/[:/]/g, "-")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchCaptions(
  postType: SocialPostType,
  subjectKey: string,
): Promise<{ facebookCaption: string; instagramCaption: string }> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/caption`,
  );
  const data = await response.json();
  const facebookCaption =
    typeof data?.facebookCaption === "string"
      ? data.facebookCaption
      : typeof data?.caption === "string"
        ? data.caption
        : null;
  const instagramCaption =
    typeof data?.instagramCaption === "string"
      ? data.instagramCaption
      : facebookCaption;
  if (!response.ok || !data.success || !facebookCaption || !instagramCaption) {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.data?.error ||
      `Error HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return { facebookCaption, instagramCaption };
}

async function fetchImageObjectUrl(
  postType: SocialPostType,
  subjectKey: string,
): Promise<string> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/image`,
  );
  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const data = await response.json();
      message =
        data?.message || data?.data?.message || data?.data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(String(message));
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

type ConfirmAction = {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  action: "publish" | "mark";
};

type PreviewTarget = {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
};

type PreviewData = {
  imageUrl: string;
  facebookCaption: string;
  instagramCaption: string;
};

function PendingActions({
  postType,
  subjectKey,
  name,
  busy,
  busyAction,
  disabled,
  onConfirm,
  onPreview,
}: {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  busy: boolean;
  busyAction: string | null;
  disabled: boolean;
  onConfirm: (action: ConfirmAction) => void;
  onPreview: (target: PreviewTarget) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={disabled}
          aria-label={`Acciones para ${name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={busy}
          onClick={() => onPreview({ postType, subjectKey, name })}
        >
          <Eye />
          Vista previa
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={busy}
          onClick={() =>
            onConfirm({
              postType,
              subjectKey,
              name,
              action: "mark",
            })
          }
        >
          <CheckCheck />
          {busy && busyAction === "mark" ? "Registrando..." : "Marcar manual"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SocialAdminPanel({
  includeOlder = false,
  pendingResultados,
  pendingRecords,
  pendingUpcoming,
  pendingSummaryUnlock,
  pendingWeeklyDigest,
  pendingStreaksMonthly,
  posts,
  stats,
}: {
  includeOlder?: boolean;
  pendingResultados: PendingResultadosRow[];
  pendingRecords: PendingRecordRow[];
  pendingUpcoming: PendingUpcomingRow[];
  pendingSummaryUnlock: PendingSummaryUnlockRow[];
  pendingWeeklyDigest: PendingWeeklyDigestRow[];
  pendingStreaksMonthly: PendingStreaksMonthlyRow[];
  posts: SocialPostRow[];
  stats: SocialPostStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<
    "download" | "publish" | "mark" | null
  >(null);
  const [confirmAction, setConfirmAction] =
    React.useState<ConfirmAction | null>(null);
  const [previewTarget, setPreviewTarget] =
    React.useState<PreviewTarget | null>(null);
  const [previewData, setPreviewData] = React.useState<PreviewData | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [previewPlatform, setPreviewPlatform] = React.useState<
    "facebook" | "instagram"
  >("facebook");

  React.useEffect(() => {
    if (!previewTarget) {
      return;
    }

    const target = previewTarget;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewData(null);
      setPreviewPlatform("facebook");
      try {
        const [imageUrl, captions] = await Promise.all([
          fetchImageObjectUrl(target.postType, target.subjectKey),
          fetchCaptions(target.postType, target.subjectKey),
        ]);
        if (cancelled) {
          URL.revokeObjectURL(imageUrl);
          return;
        }
        objectUrl = imageUrl;
        setPreviewData({
          imageUrl,
          facebookCaption: captions.facebookCaption,
          instagramCaption: captions.instagramCaption,
        });
      } catch (error) {
        if (!cancelled) {
          setPreviewError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar la vista previa",
          );
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewTarget]);

  function closePreview() {
    setPreviewTarget(null);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }

  async function runAction(
    postType: SocialPostType,
    subjectKey: string,
    action: "download" | "publish" | "mark",
  ) {
    const key = `${postType}:${subjectKey}`;
    setBusyKey(key);
    setBusyAction(action);
    try {
      if (action === "download") {
        await downloadImage(postType, subjectKey);
        toast.success("Imagen descargada");
        return;
      }

      const path =
        action === "publish"
          ? `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/publish`
          : `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/mark`;

      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "mark" ? JSON.stringify({}) : undefined,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        const message =
          data?.message ||
          data?.data?.message ||
          (Array.isArray(data?.data?.errors) && data.data.errors.join("; ")) ||
          data?.data?.error ||
          `Error HTTP ${response.status}`;
        toast.error(String(message));
        router.refresh();
        return;
      }

      if (action === "publish") {
        toast.success(`${postTypeLabel(postType)} publicados`);
        closePreview();
      } else {
        toast.success("Registrado como publicado (manual)");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al ejecutar la acción",
      );
    } finally {
      setBusyKey(null);
      setBusyAction(null);
    }
  }

  const pendingCount =
    pendingResultados.length +
    pendingRecords.length +
    pendingUpcoming.length +
    pendingSummaryUnlock.length +
    pendingWeeklyDigest.length +
    pendingStreaksMonthly.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat>
          <StatLabel>Publicaciones</StatLabel>
          <StatValue className="tabular-nums">{stats.total}</StatValue>
          <StatDescription>Total en `social_posts`</StatDescription>
        </Stat>
        <Stat>
          <StatLabel>Pendientes</StatLabel>
          <StatValue className="tabular-nums">{pendingCount}</StatValue>
          <StatDescription>Faltan Facebook y/o Instagram</StatDescription>
        </Stat>
        <Stat>
          <StatLabel>Competencias</StatLabel>
          <StatValue className="tabular-nums">{stats.competitions}</StatValue>
          <StatDescription>Con al menos un post</StatDescription>
        </Stat>
        <Stat>
          <StatLabel>Por plataforma</StatLabel>
          <StatValue className="flex items-center gap-2 tabular-nums">
            <span>{stats.facebook}</span>
            <span className="text-muted-foreground text-xl font-normal">/</span>
            <span>{stats.instagram}</span>
          </StatValue>
          <StatDescription className="flex items-center gap-1.5">
            <SiFacebook className="size-3.5" />
            Facebook
            <span className="text-muted-foreground">/</span>
            <SiInstagram className="size-3.5" />
            Instagram
          </StatDescription>
        </Stat>
      </div>

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
              const params = new URLSearchParams(searchParams.toString());
              if (value === "all") {
                params.set("older", "1");
              } else {
                params.delete("older");
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingResultados.map((row) => {
                    const busy = busyKey === `resultados:${row.subjectKey}`;
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
                          <PendingActions
                            postType="resultados"
                            subjectKey={row.subjectKey}
                            name={row.name}
                            busy={busy}
                            busyAction={busyAction}
                            disabled={busyKey !== null}
                            onConfirm={setConfirmAction}
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRecords.map((row) => {
                    const busy = busyKey === `record:${row.subjectKey}`;
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
                          <PendingActions
                            postType="record"
                            subjectKey={row.subjectKey}
                            name={`${row.level} ${row.personName}`}
                            busy={busy}
                            busyAction={busyAction}
                            disabled={busyKey !== null}
                            onConfirm={setConfirmAction}
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUpcoming.map((row) => {
                    const busy = busyKey === `upcoming:${row.subjectKey}`;
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
                          <PendingActions
                            postType="upcoming"
                            subjectKey={row.subjectKey}
                            name={row.name}
                            busy={busy}
                            busyAction={busyAction}
                            disabled={busyKey !== null}
                            onConfirm={setConfirmAction}
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSummaryUnlock.map((row) => {
                    const busy = busyKey === `summary_unlock:${row.subjectKey}`;
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
                          <PendingActions
                            postType="summary_unlock"
                            subjectKey={row.subjectKey}
                            name={`Resumen anual ${row.year}`}
                            busy={busy}
                            busyAction={busyAction}
                            disabled={busyKey !== null}
                            onConfirm={setConfirmAction}
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
            Digest semanal (lunes México). Recap de competencias W−2 + resultados
            que llegaron en W−1; lookahead 14 días. SRs solo agregados.
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingWeeklyDigest.map((row) => {
                    const busy = busyKey === `weekly_digest:${row.subjectKey}`;
                    return (
                      <TableRow key={row.subjectKey}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">
                              Semana {row.weekKey}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Recap con lag W−2
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{missingPlatformBadges(row)}</TableCell>
                        <TableCell className="text-right">
                          <PendingActions
                            postType="weekly_digest"
                            subjectKey={row.subjectKey}
                            name={`Semana ${row.weekKey}`}
                            busy={busy}
                            busyAction={busyAction}
                            disabled={busyKey !== null}
                            onConfirm={setConfirmAction}
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
            Spotlight mensual de rachas de PRs (desde el día 1 del mes, México).
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingStreaksMonthly.map((row) => {
                    const busy =
                      busyKey === `streaks_monthly:${row.subjectKey}`;
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
                          <PendingActions
                            postType="streaks_monthly"
                            subjectKey={row.subjectKey}
                            name={`Rachas ${row.monthKey}`}
                            busy={busy}
                            busyAction={busyAction}
                            disabled={busyKey !== null}
                            onConfirm={setConfirmAction}
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
          <CardTitle className="text-base">Historial</CardTitle>
          <CardDescription>
            Posts automáticos o manuales (todos los tipos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aún no hay publicaciones registradas.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Publicado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => {
                    const postType = (
                      [
                        "resultados",
                        "record",
                        "upcoming",
                        "summary_unlock",
                        "weekly_digest",
                        "streaks_monthly",
                      ].includes(post.postType)
                        ? post.postType
                        : "resultados"
                    ) as SocialPostType;
                    const busy = busyKey === `${postType}:${post.subjectKey}`;
                    const title =
                      postType === "record"
                        ? post.subjectKey
                        : postType === "summary_unlock"
                          ? `Resumen anual ${post.subjectKey}`
                          : postType === "weekly_digest"
                            ? `Semana ${post.subjectKey}`
                            : postType === "streaks_monthly"
                              ? `Rachas ${post.subjectKey}`
                              : (post.competitionName ?? post.subjectKey);
                    return (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">{title}</p>
                            <p className="text-muted-foreground text-xs">
                              {post.cityName ? `${post.cityName} · ` : null}
                              {post.competitionId ? (
                                <Link
                                  href={`https://www.worldcubeassociation.org/competitions/${post.competitionId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline-offset-2 hover:underline"
                                >
                                  {post.competitionId}
                                </Link>
                              ) : (
                                post.subjectKey
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {postTypeLabel(post.postType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              post.platform === "instagram"
                                ? "default"
                                : "secondary"
                            }
                            className="gap-1"
                          >
                            <PlatformIcon
                              platform={post.platform}
                              className="size-3"
                            />
                            {platformLabel(post.platform)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {post.postedAt
                            ? new Date(post.postedAt).toLocaleString("es-MX")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                disabled={busyKey !== null}
                                aria-label={`Acciones para ${title}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() =>
                                  setPreviewTarget({
                                    postType,
                                    subjectKey: post.subjectKey,
                                    name: title,
                                  })
                                }
                              >
                                <Eye />
                                Vista previa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <Dialog
        open={previewTarget !== null}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Vista previa
              {previewTarget ? ` · ${postTypeLabel(previewTarget.postType)}` : ""}
            </DialogTitle>
            <DialogDescription>
              {previewTarget?.name ?? "Cargando…"}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <p className="text-muted-foreground text-sm">Cargando imagen y texto…</p>
          ) : null}

          {previewError ? (
            <p className="text-destructive text-sm">{previewError}</p>
          ) : null}

          {previewData ? (
            <div className="mx-auto w-full min-w-0 max-w-sm space-y-4">
              <img
                src={previewData.imageUrl}
                alt={`Vista previa ${previewTarget?.name ?? ""}`}
                className="border-border aspect-square w-full rounded-md border object-cover"
              />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      previewPlatform === "facebook" ? "default" : "outline"
                    }
                    onClick={() => setPreviewPlatform("facebook")}
                  >
                    <SiFacebook className="size-3.5" />
                    Facebook
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      previewPlatform === "instagram" ? "default" : "outline"
                    }
                    onClick={() => setPreviewPlatform("instagram")}
                  >
                    <SiInstagram className="size-3.5" />
                    Instagram
                  </Button>
                </div>
                <pre className="bg-muted max-h-64 overflow-x-hidden overflow-y-auto rounded-md p-3 text-sm wrap-anywhere whitespace-pre-wrap">
                  {previewPlatform === "instagram"
                    ? previewData.instagramCaption
                    : previewData.facebookCaption}
                </pre>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={
                    !!previewTarget &&
                    busyKey ===
                      `${previewTarget.postType}:${previewTarget.subjectKey}`
                  }
                  onClick={() => {
                    if (!previewTarget) return;
                    void runAction(
                      previewTarget.postType,
                      previewTarget.subjectKey,
                      "download",
                    );
                  }}
                >
                  <Download className="size-4" />
                  {previewTarget &&
                  busyKey ===
                    `${previewTarget.postType}:${previewTarget.subjectKey}` &&
                  busyAction === "download"
                    ? "Descargando..."
                    : "Descargar imagen"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const text =
                      previewPlatform === "instagram"
                        ? previewData.instagramCaption
                        : previewData.facebookCaption;
                    try {
                      await navigator.clipboard.writeText(text);
                      toast.success(
                        previewPlatform === "instagram"
                          ? "Texto de Instagram copiado"
                          : "Texto de Facebook copiado",
                      );
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "No se pudo copiar el texto",
                      );
                    }
                  }}
                >
                  <ClipboardCopy className="size-4" />
                  Copiar texto{" "}
                  {previewPlatform === "instagram" ? "Instagram" : "Facebook"}
                </Button>
                {previewTarget ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={busyKey !== null}
                    onClick={() => {
                      setConfirmAction({
                        postType: previewTarget.postType,
                        subjectKey: previewTarget.subjectKey,
                        name: previewTarget.name,
                        action: "publish",
                      });
                    }}
                  >
                    <Send className="size-4" />
                    {busyKey ===
                      `${previewTarget.postType}:${previewTarget.subjectKey}` &&
                    busyAction === "publish"
                      ? "Publicando..."
                      : "Publicar"}
                  </Button>
                ) : null}
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "publish"
                ? `Publicar ${postTypeLabel(confirmAction.postType)}`
                : "Registrar publicación manual"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "publish" ? (
                <>
                  Se publicará la imagen con texto del post en las plataformas
                  faltantes para <strong>{confirmAction.name}</strong> vía Meta
                  Graph API.
                </>
              ) : (
                <>
                  Marca las plataformas faltantes de{" "}
                  <strong>{confirmAction?.name}</strong> como publicadas (sin
                  llamar a Meta). Úsalo si ya subiste la imagen a mano.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmAction) return;
                const { postType, subjectKey, action } = confirmAction;
                setConfirmAction(null);
                void runAction(postType, subjectKey, action);
              }}
            >
              {confirmAction?.action === "publish" ? "Publicar" : "Registrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
