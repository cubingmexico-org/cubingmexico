"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCheck,
  ClipboardCopy,
  Download,
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
  | "summary_unlock";

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
  return postType;
}

function apiBase(postType: SocialPostType) {
  if (postType === "resultados") return "/api/admin/social/resultados";
  if (postType === "record") return "/api/admin/social/records";
  if (postType === "summary_unlock") return "/api/admin/social/summary-unlock";
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
          : "proxima";
  a.download = `${prefix}-${subjectKey.replace(/[:/]/g, "-")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchCaption(
  postType: SocialPostType,
  subjectKey: string,
  platform: "facebook" | "instagram" = "facebook",
): Promise<string> {
  const response = await fetch(
    `${apiBase(postType)}/${encodeURIComponent(subjectKey)}/caption`,
  );
  const data = await response.json();
  const caption =
    platform === "instagram"
      ? data?.instagramCaption
      : (data?.facebookCaption ?? data?.caption);
  if (!response.ok || !data.success || typeof caption !== "string") {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.data?.error ||
      `Error HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return caption;
}

async function copyCaption(
  postType: SocialPostType,
  subjectKey: string,
  platform: "facebook" | "instagram" = "facebook",
) {
  const caption = await fetchCaption(postType, subjectKey, platform);
  await navigator.clipboard.writeText(caption);
  return caption;
}

type ConfirmAction = {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  action: "publish" | "mark";
};

function PendingActions({
  postType,
  subjectKey,
  name,
  busy,
  busyAction,
  disabled,
  onAction,
  onConfirm,
}: {
  postType: SocialPostType;
  subjectKey: string;
  name: string;
  busy: boolean;
  busyAction: string | null;
  disabled: boolean;
  onAction: (
    postType: SocialPostType,
    subjectKey: string,
    action: "download" | "publish" | "mark" | "caption",
    platform?: "facebook" | "instagram",
  ) => void;
  onConfirm: (action: ConfirmAction) => void;
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
          onClick={() => onAction(postType, subjectKey, "download")}
        >
          <Download />
          {busy && busyAction === "download"
            ? "Descargando..."
            : "Descargar imagen"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy}
          onClick={() => onAction(postType, subjectKey, "caption", "facebook")}
        >
          <ClipboardCopy />
          {busy && busyAction === "caption"
            ? "Copiando..."
            : "Copiar texto Facebook"}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy}
          onClick={() => onAction(postType, subjectKey, "caption", "instagram")}
        >
          <ClipboardCopy />
          {busy && busyAction === "caption"
            ? "Copiando..."
            : "Copiar texto Instagram"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={busy}
          onClick={() =>
            onConfirm({
              postType,
              subjectKey,
              name,
              action: "publish",
            })
          }
        >
          <Send />
          {busy && busyAction === "publish" ? "Publicando..." : "Publicar"}
        </DropdownMenuItem>
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
  posts,
  stats,
}: {
  includeOlder?: boolean;
  pendingResultados: PendingResultadosRow[];
  pendingRecords: PendingRecordRow[];
  pendingUpcoming: PendingUpcomingRow[];
  pendingSummaryUnlock: PendingSummaryUnlockRow[];
  posts: SocialPostRow[];
  stats: SocialPostStats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<
    "download" | "publish" | "mark" | "caption" | null
  >(null);
  const [confirmAction, setConfirmAction] =
    React.useState<ConfirmAction | null>(null);

  async function runAction(
    postType: SocialPostType,
    subjectKey: string,
    action: "download" | "publish" | "mark" | "caption",
    platform: "facebook" | "instagram" = "facebook",
  ) {
    const key = `${postType}:${subjectKey}`;
    setBusyKey(key);
    setBusyAction(action);
    try {
      if (action === "caption") {
        await copyCaption(postType, subjectKey, platform);
        toast.success("Texto del post copiado");
        return;
      }

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat>
          <StatLabel>Publicaciones</StatLabel>
          <StatValue className="tabular-nums">{stats.total}</StatValue>
          <StatDescription>Total en `social_posts`</StatDescription>
        </Stat>
        <Stat>
          <StatLabel>Por tipo</StatLabel>
          <StatValue className="tabular-nums">
            {stats.resultados}
            <span className="text-muted-foreground text-xl font-normal">
              {" "}
              /{" "}
            </span>
            {stats.records}
            <span className="text-muted-foreground text-xl font-normal">
              {" "}
              /{" "}
            </span>
            {stats.upcoming}
            <span className="text-muted-foreground text-xl font-normal">
              {" "}
              /{" "}
            </span>
            {stats.summaryUnlock}
          </StatValue>
          <StatDescription>
            RESULTADOS / RÉCORDS / PRÓXIMAS / RESUMEN
          </StatDescription>
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
                            onAction={runAction}
                            onConfirm={setConfirmAction}
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
                            onAction={runAction}
                            onConfirm={setConfirmAction}
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
                            onAction={runAction}
                            onConfirm={setConfirmAction}
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
                            onAction={runAction}
                            onConfirm={setConfirmAction}
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
                                  runAction(
                                    postType,
                                    post.subjectKey,
                                    "download",
                                    post.platform === "instagram"
                                      ? "instagram"
                                      : "facebook",
                                  )
                                }
                              >
                                <Download />
                                {busy && busyAction === "download"
                                  ? "Descargando..."
                                  : "Descargar imagen"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() =>
                                  runAction(
                                    postType,
                                    post.subjectKey,
                                    "caption",
                                    post.platform === "instagram"
                                      ? "instagram"
                                      : "facebook",
                                  )
                                }
                              >
                                <ClipboardCopy />
                                {busy && busyAction === "caption"
                                  ? "Copiando..."
                                  : "Copiar texto"}
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
