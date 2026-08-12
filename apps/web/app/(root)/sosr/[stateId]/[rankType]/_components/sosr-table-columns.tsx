"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { getSumOfRanksColumns } from "@/lib/sum-of-ranks-table-columns";
import { SumOfStateRanks } from "../_types";

interface GetColumnsProps {
  rankType: "single" | "average";
  genderCounts: Record<string, number>;
}

export function getColumns({
  rankType,
  genderCounts,
}: GetColumnsProps): ColumnDef<SumOfStateRanks>[] {
  return getSumOfRanksColumns({
    rankType,
    rankKey: "stateRank",
    genderCounts,
  });
}
