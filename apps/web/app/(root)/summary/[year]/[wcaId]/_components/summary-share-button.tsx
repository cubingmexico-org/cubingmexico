"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { Share2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import type { ShareCardData } from "../_lib/share-highlights";
import { SummaryShareCard } from "./summary-share-card";

type Props = {
  data: ShareCardData;
};

function canShareFiles(file: File): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SummaryShareButton({ data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleShare() {
    const node = cardRef.current;
    if (!node || busy) return;

    setBusy(true);
    try {
      const blob = await toBlob(node, {
        pixelRatio: 2,
        cacheBust: true,
        // Force light colors so dark-mode page theme doesn't leak into the PNG.
        style: {
          colorScheme: "light",
        },
      });

      if (!blob) {
        throw new Error("No se pudo generar la imagen");
      }

      const filename = `resumen-${data.year}-${data.wcaId}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      const summaryUrl = `https://www.cubingmexico.net/summary/${data.year}/${data.wcaId}`;
      const shareText = `Mi resumen anual ${data.year} en Cubing México`;

      if (canShareFiles(file)) {
        try {
          await navigator.share({
            files: [file],
            title: `Resumen ${data.year} — ${data.name}`,
            text: shareText,
            url: summaryUrl,
          });
          return;
        } catch (error) {
          // User cancelled the share sheet — don't fall through to download.
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          // canShare lied or share failed; fall back to download.
        }
      }

      downloadBlob(blob, filename);
      toast.success("Imagen descargada");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar la imagen para compartir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Share2 className="size-4" />
        )}
        Compartir
      </Button>

      {/* Off-screen card kept at real 1080×1080 so html-to-image captures correctly */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 z-[-1] overflow-hidden"
        style={{ left: -9999 }}
      >
        <SummaryShareCard ref={cardRef} data={data} />
      </div>
    </>
  );
}
