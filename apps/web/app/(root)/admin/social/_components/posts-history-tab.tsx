"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  type ConfirmAction,
  type PreviewTarget,
  type SocialPostRow,
  type SocialPostType,
} from "./social-types";
import { PlatformIcon, platformLabel, postTypeLabel } from "./social-ui";

export function PostsHistoryTab({
  posts,
  postsTotal,
  pageSize,
  busyKey,
  setConfirmAction,
  setPreviewTarget,
  totalPages,
  currentPage,
}: {
  posts: SocialPostRow[];
  postsTotal: number;
  pageSize: number;
  busyKey: string | null;
  setConfirmAction: React.Dispatch<React.SetStateAction<ConfirmAction | null>>;
  setPreviewTarget: React.Dispatch<React.SetStateAction<PreviewTarget | null>>;
  totalPages: number;
  currentPage: number;
}) {
  const router = useRouter();

  return (
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
                        "mollerz",
                        "nemesis",
                        "year_recap",
                      ].includes(post.postType)
                        ? post.postType
                        : "resultados"
                    ) as SocialPostType;
                    const title =
                      postType === "record" ||
                      postType === "mollerz" ||
                      postType === "nemesis"
                        ? post.subjectKey
                        : postType === "summary_unlock"
                          ? `Resumen anual ${post.subjectKey}`
                          : postType === "weekly_digest"
                            ? `Semana ${post.subjectKey}`
                            : postType === "streaks_monthly"
                              ? `Rachas ${post.subjectKey}`
                              : postType === "year_recap"
                                ? `Año ${post.subjectKey}`
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
                                aria-label={`Acciones de ${title}`}
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() =>
                                  setPreviewTarget({
                                    postType,
                                    subjectKey: post.subjectKey,
                                    name: title,
                                  })
                                }
                              >
                                <Eye className="size-4" />
                                Vista previa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() =>
                                  setConfirmAction({
                                    postType,
                                    subjectKey: post.subjectKey,
                                    name: title,
                                    action: "delete",
                                    postId: post.id,
                                    platform: post.platform,
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                                Eliminar
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
  );
}
