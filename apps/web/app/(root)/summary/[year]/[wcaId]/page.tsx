import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import { getPerson } from "@/db/queries";
import { getPersonAvatarFromWCA } from "@/app/(root)/persons/[id]/_lib/queries";
import { SummaryLoading } from "../../_components/summary-loading";
import { canAccessAnnualSummary } from "../../_lib/summary-access";
import { getAnnualSummary } from "./_lib/queries";
import { getPersonYearUnofficial } from "./_lib/unofficial";
import { AnnualSummaryView } from "./_components/annual-summary-view";
import { GoalsSection } from "./_components/goals-section";

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
  if (!(await canAccessAnnualSummary())) {
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
  avatarUrl,
}: {
  year: number;
  wcaId: string;
  avatarUrl: string | null;
}) {
  "use cache";
  cacheLife("days");
  cacheTag(`person-summary-page-${year}-${wcaId}`);

  const [summary, unofficial] = await Promise.all([
    getAnnualSummary(wcaId, year),
    getPersonYearUnofficial(wcaId, year),
  ]);
  if (!summary) {
    notFound();
  }

  return (
    <AnnualSummaryView
      summary={summary}
      unofficial={unofficial}
      avatarUrl={avatarUrl}
    />
  );
}

async function SummaryPage({ params }: Props) {
  if (!(await canAccessAnnualSummary())) {
    notFound();
  }

  const { year: yearRaw, wcaId } = await params;
  const year = parseYear(yearRaw);

  if (year === null) {
    notFound();
  }

  // Fetched outside SummaryPageContent so a failed WCA request isn't cached for days.
  const wcaData = await getPersonAvatarFromWCA(wcaId);
  const avatar = wcaData?.person.avatar;
  const avatarUrl = avatar && !avatar.is_default ? avatar.thumb_url : null;

  return (
    <div className="flex flex-col gap-8">
      <SummaryPageContent year={year} wcaId={wcaId} avatarUrl={avatarUrl} />
      <Suspense fallback={null}>
        <GoalsSection year={year} wcaId={wcaId} />
      </Suspense>
    </div>
  );
}

export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<SummaryLoading />}>
      <SummaryPage params={params} />
    </Suspense>
  );
}
