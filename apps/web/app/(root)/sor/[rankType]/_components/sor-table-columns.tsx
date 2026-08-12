"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { getSumOfRanksColumns } from "@/lib/sum-of-ranks-table-columns";
import { SumOfRanks } from "../_types";

interface GetColumnsProps {
  rankType: "single" | "average";
  stateCounts: Record<string, number>;
  genderCounts: Record<string, number>;
}

export function getColumns({
  rankType,
  stateCounts,
  genderCounts,
}: GetColumnsProps): ColumnDef<SumOfRanks>[] {
  return getSumOfRanksColumns({
    rankType,
    rankKey: "countryRank",
    stateCounts,
    genderCounts,
  });
}
