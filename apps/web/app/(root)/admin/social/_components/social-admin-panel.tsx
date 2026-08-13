"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eye,
  Send,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "@icons-pack/react-simple-icons";
import { Button, buttonVariants } from "@workspace/ui/components/button";
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
import { cn } from "@workspace/ui/lib/utils";

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
  if (postType === "streaks_monthly")
    return "/api/admin/social/streaks-monthly";
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

async function fetchWeeklyDigestSlidesManifest(
  week: string,
): Promise<Array<{ index: number; id: string; title: string }>> {
  const response = await fetch(
    `/api/admin/social/weekly-digest/${encodeURIComponent(week)}/slides`,
  );
  const data = await response.json();
  if (!response.ok || !data.success || !Array.isArray(data.slides)) {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.data?.error ||
      `Error HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return data.slides as Array<{ index: number; id: string; title: string }>;
}

async function fetchWeeklyDigestSlideObjectUrl(
  week: string,
  index: number,
): Promise<string> {
  const response = await fetch(
    `/api/admin/social/weekly-digest/${encodeURIComponent(week)}/slides/${index}/image`,
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

async function downloadWeeklyDigestSlide(
  week: string,
  index: number,
  slideId: string,
) {
  const response = await fetch(
    `/api/admin/social/weekly-digest/${encodeURIComponent(week)}/slides/${index}/image`,
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
  a.download = `semana-${week.replace(/[:/]/g, "-")}-${slideId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

type PreviewSlide = {
  index: number;
  id: string;
  title: string;
  imageUrl: string;
};

type PreviewData = {
  imageUrl: string;
  facebookCaption: string;
  instagramCaption: string;
  slides?: PreviewSlide[];
};

function PreviewButton({
  postType,
  subjectKey,
  name,
  disabled,
  onPreview,
}: {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  disabled: boolean;
  onPreview: (target: PreviewTarget) => void;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8"
      disabled={disabled}
      aria-label={`Vista previa de ${name}`}
      onClick={() => onPreview({ postType, subjectKey, name })}
    >
      <Eye className="size-4" />
    </Button>
  );
}

export function SocialAdminPanel({
  tab = "pendientes",
  includeOlder = false,
  pendingResultados,
  pendingRecords,
  pendingUpcoming,
  pendingSummaryUnlock,
  pendingWeeklyDigest,
  pendingStreaksMonthly,
  posts,
  postsTotal = 0,
  page = 1,
  pageSize = 30,
  stats,
}: {
  tab?: "pendientes" | "historial";
  includeOlder?: boolean;
  pendingResultados: PendingResultadosRow[];
  pendingRecords: PendingRecordRow[];
  pendingUpcoming: PendingUpcomingRow[];
  pendingSummaryUnlock: PendingSummaryUnlockRow[];
  pendingWeeklyDigest: PendingWeeklyDigestRow[];
  pendingStreaksMonthly: PendingStreaksMonthlyRow[];
  posts: SocialPostRow[];
  postsTotal?: number;
  page?: number;
  pageSize?: number;
  stats: SocialPostStats;
}) {
  const router = useRouter();
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
  const [previewSlideIndex, setPreviewSlideIndex] = React.useState(0);

  React.useEffect(() => {
    if (!previewTarget) {
      return;
    }

    const target = previewTarget;
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError(null);
      setPreviewData(null);
      setPreviewPlatform("facebook");
      setPreviewSlideIndex(0);
      try {
        if (target.postType === "weekly_digest") {
          const [manifest, captions] = await Promise.all([
            fetchWeeklyDigestSlidesManifest(target.subjectKey),
            fetchCaptions(target.postType, target.subjectKey),
          ]);
          if (cancelled) return;
          if (manifest.length === 0) {
            throw new Error("No hay slides para esta semana");
          }
          const slides: PreviewSlide[] = [];
          for (const meta of manifest) {
            const imageUrl = await fetchWeeklyDigestSlideObjectUrl(
              target.subjectKey,
              meta.index,
            );
            if (cancelled) {
              URL.revokeObjectURL(imageUrl);
              return;
            }
            objectUrls.push(imageUrl);
            slides.push({
              index: meta.index,
              id: meta.id,
              title: meta.title,
              imageUrl,
            });
          }
          setPreviewData({
            imageUrl: slides[0]!.imageUrl,
            facebookCaption: captions.facebookCaption,
            instagramCaption: captions.instagramCaption,
            slides,
          });
        } else {
          const [imageUrl, captions] = await Promise.all([
            fetchImageObjectUrl(target.postType, target.subjectKey),
            fetchCaptions(target.postType, target.subjectKey),
          ]);
          if (cancelled) {
            URL.revokeObjectURL(imageUrl);
            return;
          }
          objectUrls.push(imageUrl);
          setPreviewData({
            imageUrl,
            facebookCaption: captions.facebookCaption,
            instagramCaption: captions.instagramCaption,
          });
        }
      } catch (error) {
        for (const url of objectUrls) {
          URL.revokeObjectURL(url);
        }
        objectUrls.length = 0;
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
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewTarget]);

  function closePreview() {
    setPreviewTarget(null);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setPreviewSlideIndex(0);
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
        if (
          postType === "weekly_digest" &&
          previewData?.slides &&
          previewData.slides.length > 0
        ) {
          const slide =
            previewData.slides[previewSlideIndex] ?? previewData.slides[0]!;
          await downloadWeeklyDigestSlide(subjectKey, slide.index, slide.id);
        } else {
          await downloadImage(postType, subjectKey);
        }
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
      } else {
        toast.success("Registrado como publicado (manual)");
      }
      closePreview();
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

  const totalPages = Math.max(1, Math.ceil(postsTotal / pageSize));
  const currentPage = Math.min(page, totalPages);

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
          <StatValue className="tabular-nums">
            {tab === "pendientes" ? pendingCount : "—"}
          </StatValue>
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

      <nav className="flex flex-wrap gap-2">
        <Link
          href={includeOlder ? "/admin/social?older=1" : "/admin/social"}
          className={cn(
            buttonVariants({
              variant: tab === "pendientes" ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          Pendientes
        </Link>
        <Link
          href="/admin/social?tab=historial"
          className={cn(
            buttonVariants({
              variant: tab === "historial" ? "default" : "outline",
              size: "sm",
            }),
          )}
        >
          Historial
        </Link>
      </nav>

      {tab === "pendientes" ? (
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
                  router.push(
                    query ? `/admin/social?${query}` : "/admin/social",
                  );
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
              <CardTitle className="text-base">
                Pendientes · RESULTADOS
              </CardTitle>
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
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
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
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
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
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
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
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWeeklyDigest.map((row) => {
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
                Spotlight mensual de rachas de PRs (desde el día 1 del mes,
                México).
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
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingStreaksMonthly.map((row) => {
                        return (
                          <TableRow key={row.subjectKey}>
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-medium">
                                  Rachas {row.monthKey}
                                </p>
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
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
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
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
            <CardDescription>
              Posts automáticos o manuales (todos los tipos).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aún no hay publicaciones registradas.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Publicado</TableHead>
                        <TableHead className="text-right">
                          Vista previa
                        </TableHead>
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
                                ? new Date(post.postedAt).toLocaleString(
                                    "es-MX",
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <PreviewButton
                                postType={postType}
                                subjectKey={post.subjectKey}
                                name={title}
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

                {postsTotal > pageSize ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground text-sm tabular-nums">
                      Página {currentPage} de {totalPages} · {postsTotal}{" "}
                      publicaciones
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("tab", "historial");
                          if (currentPage > 2) {
                            params.set("page", String(currentPage - 1));
                          }
                          router.push(`/admin/social?${params.toString()}`);
                        }}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("tab", "historial");
                          params.set("page", String(currentPage + 1));
                          router.push(`/admin/social?${params.toString()}`);
                        }}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}

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
              {previewTarget
                ? ` · ${postTypeLabel(previewTarget.postType)}`
                : ""}
            </DialogTitle>
            <DialogDescription>
              {previewTarget?.name ?? "Cargando…"}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <p className="text-muted-foreground text-sm">
              Cargando imagen y texto…
            </p>
          ) : null}

          {previewError ? (
            <p className="text-destructive text-sm">{previewError}</p>
          ) : null}

          {previewData ? (
            <div className="mx-auto w-full min-w-0 max-w-sm space-y-4">
              <div className="relative">
                {/* blob: object URLs from the preview API — next/image cannot optimize these */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    previewData.slides?.[previewSlideIndex]?.imageUrl ??
                    previewData.imageUrl
                  }
                  alt={`Vista previa ${previewTarget?.name ?? ""}${
                    previewData.slides?.[previewSlideIndex]
                      ? ` · ${previewData.slides[previewSlideIndex]!.title}`
                      : ""
                  }`}
                  className="border-border aspect-square w-full rounded-md border object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 size-8 shadow-md"
                  disabled={
                    !!previewTarget &&
                    busyKey ===
                      `${previewTarget.postType}:${previewTarget.subjectKey}`
                  }
                  aria-label="Descargar imagen"
                  title="Descargar imagen"
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
                </Button>
              </div>
              {previewData.slides && previewData.slides.length > 1 ? (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={previewSlideIndex <= 0}
                    aria-label="Slide anterior"
                    onClick={() =>
                      setPreviewSlideIndex((i) => Math.max(0, i - 1))
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {previewSlideIndex + 1}/{previewData.slides.length}
                      {previewData.slides[previewSlideIndex]
                        ? ` · ${previewData.slides[previewSlideIndex]!.title}`
                        : ""}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {previewData.slides.map((slide, i) => (
                        <button
                          key={`${slide.id}-${slide.index}`}
                          type="button"
                          aria-label={`Ir a slide ${i + 1}`}
                          className={
                            i === previewSlideIndex
                              ? "bg-foreground size-2 rounded-full"
                              : "bg-muted-foreground/40 size-2 rounded-full"
                          }
                          onClick={() => setPreviewSlideIndex(i)}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    disabled={
                      previewSlideIndex >= previewData.slides.length - 1
                    }
                    aria-label="Slide siguiente"
                    onClick={() =>
                      setPreviewSlideIndex((i) =>
                        Math.min(previewData.slides!.length - 1, i + 1),
                      )
                    }
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}
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
                <div className="relative">
                  <pre className="bg-muted max-h-64 overflow-x-hidden overflow-y-auto rounded-md p-3 pr-12 text-sm wrap-anywhere whitespace-pre-wrap">
                    {previewPlatform === "instagram"
                      ? previewData.instagramCaption
                      : previewData.facebookCaption}
                  </pre>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 size-8 shadow-md"
                    aria-label={
                      previewPlatform === "instagram"
                        ? "Copiar texto Instagram"
                        : "Copiar texto Facebook"
                    }
                    title={
                      previewPlatform === "instagram"
                        ? "Copiar texto Instagram"
                        : "Copiar texto Facebook"
                    }
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
                  </Button>
                </div>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
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
                {previewTarget ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busyKey !== null}
                    onClick={() => {
                      setConfirmAction({
                        postType: previewTarget.postType,
                        subjectKey: previewTarget.subjectKey,
                        name: previewTarget.name,
                        action: "mark",
                      });
                    }}
                  >
                    <CheckCheck className="size-4" />
                    {busyKey ===
                      `${previewTarget.postType}:${previewTarget.subjectKey}` &&
                    busyAction === "mark"
                      ? "Registrando..."
                      : "Marcar manual"}
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
