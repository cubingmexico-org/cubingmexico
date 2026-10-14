"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";
import { useDeprecatedQuery } from "@/components/deprecated-events-switch";

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
  const query = useDeprecatedQuery();
  return (
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle={`/sosr/${stateId}/single${query}`}
      hrefAverage={`/sosr/${stateId}/average${query}`}
      className={className}
      {...props}
    />
  );
}
