import type { Metadata } from "next";
import { getTeam } from "@/db/queries";
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { getValidFilters } from "@/lib/data-table";
import { SearchParams } from "@/types";
import { MembersTable } from "../_components/members-table";
import { getMembersPageData } from "./_lib/queries";
import { searchParamsCache } from "../_lib/validations";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Miembros | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const stateId = (await props.params).stateId;

  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);
  const validFilters = getValidFilters(search.filters);

  const promises = getMembersPageData(
    {
      ...search,
      filters: validFilters,
    },
    stateId,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros</CardTitle>
      </CardHeader>
      <CardContent>
        <React.Suspense
          fallback={
            <DataTableSkeleton
              columnCount={7}
              filterCount={3}
              cellWidths={[
                "10rem",
                "30rem",
                "10rem",
                "10rem",
                "6rem",
                "6rem",
                "6rem",
              ]}
              shrinkZero
            />
          }
        >
          <MembersTable promises={promises} />
        </React.Suspense>
      </CardContent>
    </Card>
  );
}
