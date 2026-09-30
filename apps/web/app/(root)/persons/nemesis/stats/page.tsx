import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import type { SearchParams } from "@/types";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { searchParamsCache } from "./_lib/validations";
import {
  getNemesisStateBreakdown,
  getNemesisStatsGenderCounts,
  getNemesisStatsStateCounts,
  getNemesisStatsTable,
  getNemesisSummary,
} from "./_lib/queries";
import { NemesisSummary } from "./_components/nemesis-summary";
import { NemesisStatsControls } from "./_components/nemesis-stats-controls";
import { NemesisStatsTable } from "./_components/nemesis-stats-table";
import { NemesisStateBreakdown } from "./_components/nemesis-state-breakdown";

export const metadata: Metadata = {
  title: "Estadísticas de némesis | Cubing México",
  description:
    "Invictos, competidores con más némesis y quienes son némesis de más speedcubers en México.",
};

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const promises = Promise.all([
    getNemesisStatsTable(search),
    getNemesisStatsStateCounts(),
    getNemesisStatsGenderCounts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/persons/nemesis">
              <ArrowLeft className="size-4" />
              Buscador de némesis
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Estadísticas de némesis</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tu némesis es alguien que te supera en single y en average en todos
          los eventos en los que has competido. Aquí puedes ver quién no tiene
          némesis, quién tiene más y quién es némesis de más competidores en
          México.
        </p>
      </div>

      <React.Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        }
      >
        <SummarySection />
      </React.Suspense>

      <section className="flex flex-col gap-4">
        <NemesisStatsControls />
        <React.Suspense
          key={`${search.view}-${search.minEvents}`}
          fallback={
            <DataTableSkeleton
              columnCount={5}
              filterCount={2}
              cellWidths={["4rem", "30rem", "8rem", "8rem", "8rem"]}
              shrinkZero
            />
          }
        >
          <NemesisStatsTable promises={promises} />
        </React.Suspense>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Por estado</h2>
        <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <StateBreakdownSection />
        </React.Suspense>
      </section>
    </div>
  );
}

async function SummarySection() {
  const summary = await getNemesisSummary();
  return <NemesisSummary summary={summary} />;
}

async function StateBreakdownSection() {
  const rows = await getNemesisStateBreakdown();
  return <NemesisStateBreakdown rows={rows} />;
}
