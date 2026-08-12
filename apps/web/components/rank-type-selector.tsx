"use client";

import * as React from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

interface RankTypeSelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedRankType: "single" | "average";
  hrefSingle: string;
  hrefAverage: string;
  /** When true, render nothing (e.g. 333mbf has no average). */
  hidden?: boolean;
  className?: string;
}

export function RankTypeSelector({
  selectedRankType,
  hrefSingle,
  hrefAverage,
  hidden = false,
  className,
  ...props
}: RankTypeSelectorProps) {
  const router = useRouter();

  if (hidden) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <span className="font-semibold text-sm">Tipo</span>
      <ToggleGroup
        type="single"
        variant="outline"
        value={selectedRankType}
        className="w-full"
      >
        <ToggleGroupItem
          className="w-[50%]"
          value="single"
          aria-label="Single"
          onClick={() => router.push(hrefSingle)}
        >
          Single
        </ToggleGroupItem>
        <ToggleGroupItem
          className="w-[50%]"
          value="average"
          aria-label="Average"
          onClick={() => router.push(hrefAverage)}
        >
          Average
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
