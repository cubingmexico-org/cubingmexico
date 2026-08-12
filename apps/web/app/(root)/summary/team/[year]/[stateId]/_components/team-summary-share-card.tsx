"use client";

import { forwardRef } from "react";
import { SummaryShareCardShell } from "../../../../_components/summary-share-card-shell";
import type { TeamShareCardData } from "../_lib/share-highlights";

type Props = {
  data: TeamShareCardData;
};

export const TeamSummaryShareCard = forwardRef<HTMLDivElement, Props>(
  function TeamSummaryShareCard({ data }, ref) {
    const { name, stateName, image, year, highlights } = data;
    const initials =
      name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 3) || stateName.slice(0, 2);

    return (
      <SummaryShareCardShell
        ref={ref}
        subtitle="Resumen del Team"
        highlights={highlights}
        cardDataAttr="data-team-summary-share-card"
        identity={
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-44 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- html-to-image capture needs a plain img
                <img
                  src={image}
                  alt=""
                  width={176}
                  height={176}
                  className="size-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <span className="text-[56px] font-bold text-emerald-700">
                  {initials}
                </span>
              )}
            </div>
            <h1 className="px-2 text-[64px] font-bold leading-[1.1] tracking-tight text-neutral-900">
              {name}
            </h1>
            <p className="text-[52px] font-semibold leading-none text-emerald-600">
              {year}
            </p>
            <p className="text-[32px] font-medium tracking-wide text-neutral-500">
              {stateName}
            </p>
          </div>
        }
      />
    );
  },
);
