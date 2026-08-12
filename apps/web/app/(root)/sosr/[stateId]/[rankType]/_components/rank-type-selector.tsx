"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";

interface RankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  stateId: string;
  selectedRankType: "single" | "average";
  className?: string;
}

export function RankTypeSelector({
  stateId,
  selectedRankType,
  className,
  ...props
}: RankTypeSelectorProps) {
  return (
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle={`/sosr/${stateId}/single`}
      hrefAverage={`/sosr/${stateId}/average`}
      className={className}
      {...props}
    />
  );
}
