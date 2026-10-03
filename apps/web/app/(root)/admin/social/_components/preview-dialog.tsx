"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Send,
} from "lucide-react";
import { SiFacebook, SiInstagram } from "@icons-pack/react-simple-icons";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  type ConfirmAction,
  type PreviewData,
  type PreviewTarget,
  type SocialPostType,
} from "./social-types";
import { postTypeLabel } from "./social-ui";

export function PreviewDialog({
  tab,
  busyKey,
  busyAction,
  setConfirmAction,
  previewTarget,
  previewData,
  previewLoading,
  previewError,
  previewPlatform,
  setPreviewPlatform,
  previewSlideIndex,
  setPreviewSlideIndex,
  closePreview,
  runAction,
}: {
  tab: "pendientes" | "historial";
  busyKey: string | null;
  busyAction: "download" | "publish" | "mark" | "delete" | null;
  setConfirmAction: React.Dispatch<React.SetStateAction<ConfirmAction | null>>;
  previewTarget: PreviewTarget | null;
  previewData: PreviewData | null;
  previewLoading: boolean;
  previewError: string | null;
  previewPlatform: "facebook" | "instagram";
  setPreviewPlatform: React.Dispatch<
    React.SetStateAction<"facebook" | "instagram">
  >;
  previewSlideIndex: number;
  setPreviewSlideIndex: React.Dispatch<React.SetStateAction<number>>;
  closePreview: () => void;
  runAction: (
    postType: SocialPostType,
    subjectKey: string,
    action: "download" | "publish" | "mark" | "delete",
    postId?: string,
  ) => Promise<void>;
}) {
  return (
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
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URL */}
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
                  disabled={previewSlideIndex >= previewData.slides.length - 1}
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
            {tab !== "historial" ? (
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
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
