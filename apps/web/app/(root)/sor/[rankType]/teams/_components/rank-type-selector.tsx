"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";
import { useDeprecatedQuery } from "@/components/deprecated-events-switch";

interface RankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedRankType: "single" | "average";
  className?: string;
}

export function RankTypeSelector({
  selectedRankType,
  className,
  ...props
}: RankTypeSelectorProps) {
  const query = useDeprecatedQuery();
  return (
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle={`/sor/single/teams${query}`}
      hrefAverage={`/sor/average/teams${query}`}
      className={className}
      {...props}
    />
  );
}
