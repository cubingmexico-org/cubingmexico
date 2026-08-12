"use client";

import { forwardRef } from "react";
import { SummaryShareCardShell } from "../../../_components/summary-share-card-shell";
import type { ShareCardData } from "../_lib/share-highlights";

type Props = {
  data: ShareCardData;
};

export const SummaryShareCard = forwardRef<HTMLDivElement, Props>(
  function SummaryShareCard({ data }, ref) {
    const { name, wcaId, year, highlights } = data;

    return (
      <SummaryShareCardShell
        ref={ref}
        subtitle="Resumen anual"
        highlights={highlights}
        identity={
          <div className="space-y-2 text-center">
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
        }
      />
    );
  },
);
