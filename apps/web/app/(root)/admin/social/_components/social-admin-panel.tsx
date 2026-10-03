"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  apiBase,
  downloadCarouselSlide,
  downloadImage,
  fetchCaptions,
  fetchCarouselSlideObjectUrl,
  fetchCarouselSlidesManifest,
  fetchImageObjectUrl,
} from "./social-api";
import {
  type ConfirmAction,
  type PendingMollerzRow,
  type PendingNemesisRow,
  type PendingRecordRow,
  type PendingResultadosRow,
  type PendingStreaksMonthlyRow,
  type PendingSummaryUnlockRow,
  type PendingUpcomingRow,
  type PendingWeeklyDigestRow,
  type PendingYearRecapRow,
  type PreviewData,
  type PreviewSlide,
  type PreviewTarget,
  type SocialPostRow,
  type SocialPostStats,
  type SocialPostType,
  isCarouselPostType,
} from "./social-types";
import { postTypeLabel } from "./social-ui";
import { SocialStatsGrid } from "./social-stats-grid";
import { PendingPostsTab } from "./pending-posts-tab";
import { PostsHistoryTab } from "./posts-history-tab";
import { PreviewDialog } from "./preview-dialog";
import { ConfirmActionDialog } from "./confirm-action-dialog";

export type {
  SocialPostType,
  PendingResultadosRow,
  PendingRecordRow,
  PendingUpcomingRow,
  PendingSummaryUnlockRow,
  PendingWeeklyDigestRow,
  PendingStreaksMonthlyRow,
  PendingYearRecapRow,
  PendingMollerzRow,
  PendingNemesisRow,
  SocialPostRow,
  SocialPostStats,
} from "./social-types";

export function SocialAdminPanel({
  tab = "pendientes",
  includeOlder = false,
  pendingResultados,
  pendingRecords,
  pendingUpcoming,
  pendingSummaryUnlock,
  pendingWeeklyDigest,
  pendingStreaksMonthly,
  pendingYearRecap = [],
  pendingMollerz,
  pendingNemesis = [],
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
  pendingYearRecap?: PendingYearRecapRow[];
  pendingMollerz: PendingMollerzRow[];
  pendingNemesis?: PendingNemesisRow[];
  posts: SocialPostRow[];
  postsTotal?: number;
  page?: number;
  pageSize?: number;
  stats: SocialPostStats;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [busyAction, setBusyAction] = React.useState<
    "download" | "publish" | "mark" | "delete" | null
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
        if (isCarouselPostType(target.postType)) {
          const carouselType = target.postType;
          const [manifest, captions] = await Promise.all([
            fetchCarouselSlidesManifest(carouselType, target.subjectKey),
            fetchCaptions(carouselType, target.subjectKey),
          ]);
          if (cancelled) return;
          if (manifest.length === 0) {
            throw new Error("No hay slides para esta publicación");
          }
          const slides: PreviewSlide[] = [];
          for (const meta of manifest) {
            const imageUrl = await fetchCarouselSlideObjectUrl(
              carouselType,
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
    action: "download" | "publish" | "mark" | "delete",
    postId?: string,
  ) {
    const key = `${postType}:${subjectKey}`;
    setBusyKey(key);
    setBusyAction(action);
    try {
      if (action === "download") {
        if (
          isCarouselPostType(postType) &&
          previewData?.slides &&
          previewData.slides.length > 0
        ) {
          const slide =
            previewData.slides[previewSlideIndex] ?? previewData.slides[0]!;
          await downloadCarouselSlide(
            postType,
            subjectKey,
            slide.index,
            slide.id,
          );
        } else {
          await downloadImage(postType, subjectKey);
        }
        toast.success("Imagen descargada");
        return;
      }

      if (action === "delete") {
        if (!postId) {
          toast.error("No se pudo identificar la publicación");
          return;
        }
        const response = await fetch(
          `/api/admin/social/posts/${encodeURIComponent(postId)}`,
          { method: "DELETE" },
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
          toast.error(String(data?.message || `Error HTTP ${response.status}`));
          router.refresh();
          return;
        }
        toast.success("Publicación eliminada del historial");
        closePreview();
        router.refresh();
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
    pendingStreaksMonthly.length +
    pendingYearRecap.length +
    pendingMollerz.length +
    pendingNemesis.length;

  const totalPages = Math.max(1, Math.ceil(postsTotal / pageSize));
  const currentPage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <SocialStatsGrid tab={tab} stats={stats} pendingCount={pendingCount} />

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
        <PendingPostsTab
          includeOlder={includeOlder}
          pendingResultados={pendingResultados}
          pendingRecords={pendingRecords}
          pendingUpcoming={pendingUpcoming}
          pendingSummaryUnlock={pendingSummaryUnlock}
          pendingWeeklyDigest={pendingWeeklyDigest}
          pendingStreaksMonthly={pendingStreaksMonthly}
          pendingYearRecap={pendingYearRecap}
          pendingMollerz={pendingMollerz}
          pendingNemesis={pendingNemesis}
          busyKey={busyKey}
          setPreviewTarget={setPreviewTarget}
        />
      ) : (
        <PostsHistoryTab
          posts={posts}
          postsTotal={postsTotal}
          pageSize={pageSize}
          busyKey={busyKey}
          setConfirmAction={setConfirmAction}
          setPreviewTarget={setPreviewTarget}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      )}

      <PreviewDialog
        tab={tab}
        busyKey={busyKey}
        busyAction={busyAction}
        setConfirmAction={setConfirmAction}
        previewTarget={previewTarget}
        previewData={previewData}
        previewLoading={previewLoading}
        previewError={previewError}
        previewPlatform={previewPlatform}
        setPreviewPlatform={setPreviewPlatform}
        previewSlideIndex={previewSlideIndex}
        setPreviewSlideIndex={setPreviewSlideIndex}
        closePreview={closePreview}
        runAction={runAction}
      />

      <ConfirmActionDialog
        confirmAction={confirmAction}
        setConfirmAction={setConfirmAction}
        runAction={runAction}
      />
    </div>
  );
}
