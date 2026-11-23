"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { getSumOfRanksColumns } from "@/lib/sum-of-ranks-table-columns";
import type { SumOfGroupRanks } from "../_lib/sor-types";
import type { EventScope } from "@/lib/constants";

interface GetColumnsProps {
  rankType: "single" | "average";
  genderCounts: Record<string, number>;
  scope: EventScope;
}

export function getGroupSORColumns({
  rankType,
  genderCounts,
  scope,
}: GetColumnsProps): ColumnDef<SumOfGroupRanks>[] {
  return getSumOfRanksColumns({
    rankType,
    rankKey: "groupRank",
    genderCounts,
    scope,
  });
}
