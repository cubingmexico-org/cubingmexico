"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";

interface RankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedRankType: "single" | "average";
  className?: string;
}

export function RankTypeSelector({
  selectedRankType,
  className,
  ...props
}: RankTypeSelectorProps) {
  return (
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle="/sor/single/teams"
      hrefAverage="/sor/average/teams"
      className={className}
      {...props}
    />
  );
}
