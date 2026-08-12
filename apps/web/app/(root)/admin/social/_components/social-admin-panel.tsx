"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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

export type PendingResultadosRow = {
  id: string;
  name: string;
  cityName: string;
  endDate: Date | string;
  facebookPosted: boolean;
  instagramPosted: boolean;
};

export type SocialPostRow = {
  id: string;
  competitionId: string;
  competitionName: string;
  cityName: string;
  platform: string;
  externalId: string | null;
  postedAt: Date | string | null;
};

export type SocialPostStats = {
  total: number;
  competitions: number;
  facebook: number;
  instagram: number;
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

function missingLabel(row: PendingResultadosRow) {
  const missing: string[] = [];
  if (!row.facebookPosted) missing.push("Facebook");
  if (!row.instagramPosted) missing.push("Instagram");
  return missing.join(" · ");
}

async function downloadImage(competitionId: string) {
  const response = await fetch(
    `/api/admin/social/resultados/${encodeURIComponent(competitionId)}/image`,
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
  a.download = `resultados-${competitionId}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchCaption(competitionId: string): Promise<string> {
  const response = await fetch(
    `/api/admin/social/resultados/${encodeURIComponent(competitionId)}/caption`,
  );
  const data = await response.json();
  if (!response.ok || !data.success || typeof data.caption !== "string") {
    const message =
      data?.message ||
      data?.data?.message ||
      data?.data?.error ||
      `Error HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return data.caption;
}

async function copyCaption(competitionId: string) {
  const caption = await fetchCaption(competitionId);
  await navigator.clipboard.writeText(caption);
  return caption;
}

export function SocialAdminPanel({
  pending,
  posts,
  stats,
}: {
  pending: PendingResultadosRow[];
  posts: SocialPostRow[];
  stats: SocialPostStats;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<
    "download" | "publish" | "mark" | "caption" | null
  >(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    competitionId: string;
    name: string;
    action: "publish" | "mark";
  } | null>(null);

  async function runAction(
    competitionId: string,
    action: "download" | "publish" | "mark" | "caption",
  ) {
    setBusyId(competitionId);
    setBusyAction(action);
    try {
      if (action === "caption") {
        await copyCaption(competitionId);
        toast.success("Texto del post copiado");
        return;
      }

      if (action === "download") {
        await downloadImage(competitionId);
        try {
          await copyCaption(competitionId);
          toast.success("Imagen descargada y texto copiado");
        } catch {
          toast.success("Imagen descargada (no se pudo copiar el texto)");
        }
        return;
      }

      const path =
        action === "publish"
          ? `/api/admin/social/resultados/${encodeURIComponent(competitionId)}/publish`
          : `/api/admin/social/resultados/${encodeURIComponent(competitionId)}/mark`;

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
        // Refresh anyway — a platform may have succeeded before the other failed.
        router.refresh();
        return;
      }

      if (action === "publish") {
        toast.success("RESULTADOS publicados (imagen + texto)");
      } else {
        toast.success("Registrado como publicado (manual)");
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al ejecutar la acción",
      );
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Publicaciones</CardTitle>
            <CardDescription>Total en `social_posts`</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Competencias</CardTitle>
            <CardDescription>Con al menos un post</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {stats.competitions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por plataforma</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <SiFacebook className="size-3.5" />
              Facebook
              <span className="text-muted-foreground">/</span>
              <SiInstagram className="size-3.5" />
              Instagram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-3xl font-semibold tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                {stats.facebook}
              </span>
              <span className="text-muted-foreground text-xl font-normal">
                /
              </span>
              <span className="inline-flex items-center gap-1.5">
                {stats.instagram}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes</CardTitle>
          <CardDescription>
            Competencias MX con resultados sin Facebook y/o Instagram. Puedes
            reintentar la publicación automática, descargar la imagen para
            publicar a mano, o registrar un post manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No hay competencias pendientes.
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
                  {pending.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">{row.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {row.cityName} · {row.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
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
                            <span className="sr-only">{missingLabel(row)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                disabled={busyId !== null}
                                aria-label={`Acciones para ${row.name}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => runAction(row.id, "download")}
                              >
                                <Download />
                                {busy && busyAction === "download"
                                  ? "Descargando..."
                                  : "Descargar imagen"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() => runAction(row.id, "caption")}
                              >
                                <ClipboardCopy />
                                {busy && busyAction === "caption"
                                  ? "Copiando..."
                                  : "Copiar texto"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() =>
                                  setConfirmAction({
                                    competitionId: row.id,
                                    name: row.name,
                                    action: "publish",
                                  })
                                }
                              >
                                <Send />
                                {busy && busyAction === "publish"
                                  ? "Publicando..."
                                  : "Publicar"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={busy}
                                onClick={() =>
                                  setConfirmAction({
                                    competitionId: row.id,
                                    name: row.name,
                                    action: "mark",
                                  })
                                }
                              >
                                <CheckCheck />
                                {busy && busyAction === "mark"
                                  ? "Registrando..."
                                  : "Marcar manual"}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">RESULTADOS publicados</CardTitle>
          <CardDescription>
            Historial de posts (automáticos o manuales). Puedes volver a
            descargar la imagen o copiar el texto del post.
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
                    <TableHead>Competencia</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>ID externo</TableHead>
                    <TableHead>Publicado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{post.competitionName}</p>
                          <p className="text-muted-foreground text-xs">
                            {post.cityName} ·{" "}
                            <Link
                              href={`https://www.worldcubeassociation.org/competitions/${post.competitionId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline-offset-2 hover:underline"
                            >
                              {post.competitionId}
                            </Link>
                          </p>
                        </div>
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
                      <TableCell>
                        <code className="text-muted-foreground break-all text-xs">
                          {post.externalId ?? "—"}
                        </code>
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
                              disabled={busyId !== null}
                              aria-label={`Acciones para ${post.competitionName}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={busyId === post.competitionId}
                              onClick={() =>
                                runAction(post.competitionId, "download")
                              }
                            >
                              <Download />
                              {busyId === post.competitionId &&
                              busyAction === "download"
                                ? "Descargando..."
                                : "Descargar imagen"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={busyId === post.competitionId}
                              onClick={() =>
                                runAction(post.competitionId, "caption")
                              }
                            >
                              <ClipboardCopy />
                              {busyId === post.competitionId &&
                              busyAction === "caption"
                                ? "Copiando..."
                                : "Copiar texto"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
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
                ? "Publicar RESULTADOS"
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
                const { competitionId, action } = confirmAction;
                setConfirmAction(null);
                void runAction(competitionId, action);
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
