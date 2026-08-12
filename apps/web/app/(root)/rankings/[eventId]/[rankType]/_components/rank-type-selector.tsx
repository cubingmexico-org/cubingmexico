"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";
import { shouldHideRankTypeSelector } from "@/lib/selectors";
import type { EventId } from "@/types/wca";

interface RankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedEventId: EventId;
  selectedRankType: "single" | "average";
  hrefSingle: string;
  hrefAverage: string;
  className?: string;
}

export function RankTypeSelector({
  selectedEventId,
  selectedRankType,
  hrefSingle,
  hrefAverage,
  className,
  ...props
}: RankTypeSelectorProps) {
  return (
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle={hrefSingle}
      hrefAverage={hrefAverage}
      hidden={shouldHideRankTypeSelector(selectedEventId)}
      className={className}
      {...props}
    />
  );
}
