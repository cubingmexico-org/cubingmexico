import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getTeam } from "@/db/queries";
import { SummaryLoading } from "../../../_components/summary-loading";
import { ANNUAL_SUMMARY_ENABLED } from "@/lib/constants";
import { getTeamAnnualSummary } from "./_lib/queries";
import { TeamAnnualSummaryView } from "./_components/team-annual-summary-view";

type Props = {
  params: Promise<{ year: string; stateId: string }>;
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

  const { year: yearRaw, stateId } = await params;
  const year = parseYear(yearRaw);
  const team = await getTeam(stateId);

  if (!team || year === null) {
    return {
      title: "Resumen no encontrado | Cubing México",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Resumen anual ${year} de ${team.name} | Cubing México`,
    description: `Resumen anual ${year} de ${team.name}: competencias, podios, récords y más.`,
    robots: { index: false, follow: false },
  };
}

async function TeamSummaryPageContent({
  year,
  stateId,
}: {
  year: number;
  stateId: string;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(`team-summary-page-${year}-${stateId}`);

  const summary = await getTeamAnnualSummary(stateId, year);
  if (!summary) {
    notFound();
  }

  return <TeamAnnualSummaryView summary={summary} />;
}

async function TeamSummaryPage({ params }: Props) {
  if (!ANNUAL_SUMMARY_ENABLED) {
    notFound();
  }

  const { year: yearRaw, stateId } = await params;
  const year = parseYear(yearRaw);

  if (year === null) {
    notFound();
  }

  return <TeamSummaryPageContent year={year} stateId={stateId} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<SummaryLoading />}>
      <TeamSummaryPage params={params} />
    </Suspense>
  );
}
