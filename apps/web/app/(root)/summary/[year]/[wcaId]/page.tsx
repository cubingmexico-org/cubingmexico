import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPerson } from "@/db/queries";
import { ANNUAL_SUMMARY_ENABLED } from "@/lib/constants";
import { getAnnualSummary } from "./_lib/queries";
import { AnnualSummaryView } from "./_components/annual-summary-view";

type Props = {
  params: Promise<{ year: string; wcaId: string }>;
};

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  if (year < 2003 || year > 2100) return null;
  return year;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!ANNUAL_SUMMARY_ENABLED) {
    return {
      title: "Resumen no encontrado | Cubing México",
      robots: { index: false, follow: false },
    };
  }

  const { year: yearRaw, wcaId } = await params;
  const year = parseYear(yearRaw);
  const person = await getPerson(wcaId);

  if (!person || year === null) {
    return {
      title: "Resumen no encontrado | Cubing México",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Resumen anual ${year} de ${person.name ?? wcaId} | Cubing México`,
    description: `Resumen anual ${year} de ${person.name ?? wcaId}: competencias, podios, resoluciones y marcas personales.`,
    robots: { index: false, follow: false },
  };
}

async function SummaryPageContent({
  year,
  wcaId,
}: {
  year: number;
  wcaId: string;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(`person-summary-page-${year}-${wcaId}`);

  const summary = await getAnnualSummary(wcaId, year);
  if (!summary) {
    notFound();
  }

  return <AnnualSummaryView summary={summary} />;
}

async function SummaryPage({ params }: Props) {
  if (!ANNUAL_SUMMARY_ENABLED) {
    notFound();
  }

  const { year: yearRaw, wcaId } = await params;
  const year = parseYear(yearRaw);

  if (year === null) {
    notFound();
  }

  return <SummaryPageContent year={year} wcaId={wcaId} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-muted rounded w-2/3 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-20 bg-muted rounded w-full" />
          <div className="h-40 bg-muted rounded w-full" />
        </div>
      }
    >
      <SummaryPage params={params} />
    </Suspense>
  );
}
