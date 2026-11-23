"use client";

import * as React from "react";
import { RankTypeSelector as SharedRankTypeSelector } from "@/components/rank-type-selector";
import { useDeprecatedQuery } from "@/components/deprecated-events-switch";
import { groupBasePath } from "@/lib/groups";
import type { GroupKind } from "@workspace/db/schema";

interface GroupSORRankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  groupId: string;
  kind: GroupKind;
  selectedRankType: "single" | "average";
  className?: string;
}

export function GroupSORRankTypeSelector({
  groupId,
  kind,
  selectedRankType,
  className,
  ...props
}: GroupSORRankTypeSelectorProps) {
  const query = useDeprecatedQuery();
  const base = `${groupBasePath(kind)}/${groupId}/sor`;
  return (
    <SharedRankTypeSelector
      selectedRankType={selectedRankType}
      hrefSingle={`${base}/single${query}`}
      hrefAverage={`${base}/average${query}`}
      className={className}
      {...props}
    />
  );
}
