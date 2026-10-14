"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { getSumOfRanksColumns } from "@/lib/sum-of-ranks-table-columns";
import { SumOfStateRanks } from "../_types";
import type { EventScope } from "@/lib/constants";

interface GetColumnsProps {
  rankType: "single" | "average";
  genderCounts: Record<string, number>;
  scope: EventScope;
}

export function getColumns({
  rankType,
  genderCounts,
  scope,
}: GetColumnsProps): ColumnDef<SumOfStateRanks>[] {
  return getSumOfRanksColumns({
    rankType,
    rankKey: "stateRank",
    genderCounts,
    scope,
  });
}
