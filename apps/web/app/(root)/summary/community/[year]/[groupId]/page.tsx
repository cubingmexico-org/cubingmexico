import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { GROUP_ID_REGEX } from "@/lib/groups";
import { getGroupInfo } from "@/app/(root)/groups/_lib/queries";
import { SummaryLoading } from "../../../_components/summary-loading";
import { canAccessAnnualSummary } from "../../../_lib/summary-access";
import { getCommunityAnnualSummary } from "./_lib/queries";
import { CommunityAnnualSummaryView } from "./_components/community-annual-summary-view";

type Props = {
  params: Promise<{ year: string; groupId: string }>;
};

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  if (year < 2003 || year > 2100) return null;
  return year;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!(await canAccessAnnualSummary())) {
    return {
      title: "Resumen no encontrado | Cubing México",
      robots: { index: false, follow: false },
    };
  }

  const { year: yearRaw, groupId } = await params;
  const year = parseYear(yearRaw);
  const info = GROUP_ID_REGEX.test(groupId)
    ? await getGroupInfo(groupId)
    : null;

  if (!info || info.kind !== "community" || year === null) {
    return {
      title: "Resumen no encontrado | Cubing México",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `Resumen anual ${year} de ${info.name} | Cubing México`,
    description: `Resumen anual ${year} de ${info.name}: actividad, podios, récords y más.`,
    robots: { index: false, follow: false },
  };
}

async function CommunitySummaryPageContent({
  year,
  groupId,
}: {
  year: number;
  groupId: string;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(`community-summary-page-${year}-${groupId}`);

  const summary = await getCommunityAnnualSummary(groupId, year);
  if (!summary) {
    notFound();
  }

  return <CommunityAnnualSummaryView summary={summary} />;
}

async function CommunitySummaryPage({ params }: Props) {
  if (!(await canAccessAnnualSummary())) {
    notFound();
  }

  const { year: yearRaw, groupId } = await params;
  const year = parseYear(yearRaw);

  if (year === null || !GROUP_ID_REGEX.test(groupId)) {
    notFound();
  }

  return <CommunitySummaryPageContent year={year} groupId={groupId} />;
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<SummaryLoading />}>
      <CommunitySummaryPage params={params} />
    </Suspense>
  );
}
