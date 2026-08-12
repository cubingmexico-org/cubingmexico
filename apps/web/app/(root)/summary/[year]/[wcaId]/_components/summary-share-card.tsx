"use client";

import { forwardRef } from "react";
import { CubingMexico } from "@workspace/icons";
import { cn } from "@workspace/ui/lib/utils";
import type {
  ShareCardData,
  ShareHighlightTone,
} from "../_lib/share-highlights";

/** Instagram / WhatsApp story portrait */
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

function valueToneClass(tone: ShareHighlightTone | undefined): string {
  switch (tone) {
    case "gold":
      return "text-amber-500";
    case "silver":
      return "text-slate-500";
    case "bronze":
      return "text-yellow-700";
    default:
      return "text-emerald-600";
  }
}

type Props = {
  data: ShareCardData;
};

export const SummaryShareCard = forwardRef<HTMLDivElement, Props>(
  function SummaryShareCard({ data }, ref) {
    const { name, wcaId, year, highlights } = data;
    const rows = Math.max(1, Math.ceil(highlights.length / 2));

    return (
      <div
        ref={ref}
        data-summary-share-card
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        className="relative flex flex-col overflow-hidden bg-[#f4f7f5] text-neutral-900"
      >
        {/* Atmosphere */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 55% at 50% -8%, rgba(16, 185, 129, 0.18), transparent 58%), radial-gradient(ellipse 70% 45% at -10% 70%, rgba(5, 150, 105, 0.1), transparent 55%), radial-gradient(ellipse 80% 50% at 110% 85%, rgba(251, 191, 36, 0.12), transparent 55%), linear-gradient(165deg, #f8fbf9 0%, #eef5f1 42%, #f7f5f0 100%)",
            }}
          />
          {/* Soft cube lattice */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `
                linear-gradient(135deg, #0f172a 1.5px, transparent 1.5px),
                linear-gradient(225deg, #0f172a 1.5px, transparent 1.5px)
              `,
              backgroundSize: "72px 72px",
              backgroundPosition: "0 0, 36px 0",
            }}
          />
          {/* Large watermark logo */}
          <CubingMexico className="absolute -right-24 -bottom-16 size-180 text-black opacity-[0.04]" />
          {/* Edge vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 85% 75% at 50% 45%, transparent 40%, rgba(15, 23, 42, 0.06) 100%)",
            }}
          />
          {/* Top accent bar */}
          <div
            className="absolute inset-x-0 top-0 h-3"
            style={{
              background:
                "linear-gradient(90deg, #059669 0%, #10b981 45%, #f59e0b 100%)",
            }}
          />
        </div>

        <div className="relative z-10 flex h-full flex-col px-14 pt-16 pb-12">
          <header className="flex shrink-0 items-center gap-5">
            <CubingMexico className="size-28 shrink-0 text-black" />
            <div className="min-w-0">
              <p className="text-[40px] font-semibold uppercase tracking-[0.1em] text-neutral-900">
                Cubing México
              </p>
              <p className="text-[32px] text-neutral-500">Resumen anual</p>
            </div>
          </header>

          <div className="mt-10 shrink-0 space-y-2 text-center">
            <h1 className="px-2 text-[64px] font-bold leading-[1.1] tracking-tight text-neutral-900">
              {name}
            </h1>
            <p className="text-[52px] font-semibold leading-none text-emerald-600">
              {year}
            </p>
            <p className="text-[32px] font-medium tracking-wide text-neutral-500">
              {wcaId}
            </p>
          </div>

          <div
            className="mt-12 grid min-h-0 flex-1 grid-cols-2 gap-x-10 gap-y-2"
            style={{
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            }}
          >
            {highlights.map((h) => (
              <div
                key={h.id}
                className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center"
              >
                <p
                  className={cn(
                    "text-8xl font-bold leading-none tabular-nums",
                    valueToneClass(h.tone),
                  )}
                >
                  {h.value}
                </p>
                <p className="text-[40px] font-semibold leading-tight text-neutral-800">
                  {h.label}
                </p>
                {h.detail ? (
                  <p className="text-3xl leading-snug text-neutral-500">
                    {h.detail}
                  </p>
                ) : (
                  <p className="text-3xl leading-snug text-transparent select-none">
                    —
                  </p>
                )}
              </div>
            ))}
          </div>

          <footer className="mt-8 shrink-0 space-y-1 text-center">
            <p className="text-[34px] font-medium tracking-wide text-neutral-500">
              @cubingmexico
            </p>
            <p className="text-[28px] font-medium tracking-wide text-neutral-400">
              cubingmexico.net
            </p>
          </footer>
        </div>
      </div>
    );
  },
);

export { CARD_WIDTH, CARD_HEIGHT };
