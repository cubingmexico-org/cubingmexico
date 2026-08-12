import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeam } from "@/db/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { buttonVariants } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import {
  Calendar,
  CalendarRange,
  ChartNoAxesCombined,
  Flame,
  History,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import { ANNUAL_SUMMARY_ENABLED } from "@/lib/constants";
import { getDefaultSummaryYear } from "@/app/(root)/summary/_lib/summary-year";
import {
  getStatisticsPageData,
  getTeamCompetitionEventOptions,
} from "./_lib/queries";
import {
  KeyStat,
  MedalStrip,
  NationalRecordsList,
} from "../_components/team-profile-shared";
import { TeamResultsChart } from "./_components/team-results-chart";

type Props = {
  params: Promise<{ stateId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stateId = (await params).stateId;
  const team = await getTeam(stateId);

  return {
    title: `${team?.name} | Estadísticas | Cubing México`,
    description: `${team?.name} es un equipo de ${team?.state} que compite en competencias de la World Cube Association.`,
  };
}

export default async function Page(props: {
  params: Promise<{ stateId: string }>;
}) {
  const stateId = (await props.params).stateId;
  const [data, eventOptions] = await Promise.all([
    getStatisticsPageData(stateId),
    getTeamCompetitionEventOptions(stateId),
  ]);

  if (!data) {
    return notFound();
  }

  const {
    team,
    medals,
    competitionsCount,
    nationalRecords,
    totalNationalRecords,
    activeYears,
  } = data;

  const summaryYear = getDefaultSummaryYear();
  const stateName = team.state ?? "";
  const recordsAsOfYear = summaryYear - 1;
  const recordsAsOfDate = `${recordsAsOfYear}-12-31`;
  const recordsAsOfLabel = `31 dic ${recordsAsOfYear}`;

  const exploreLinks = [
    {
      href: `/rankings/333/single?state=${encodeURIComponent(stateName)}`,
      label: `Rankings de ${stateName}`,
      icon: Users,
    },
    {
      href: `/records?state=${encodeURIComponent(stateName)}`,
      label: `Récords de ${stateName}`,
      icon: Trophy,
    },
    {
      href: `/records?state=${encodeURIComponent(stateName)}&asOf=${recordsAsOfDate}`,
      label: `Récords hasta ${recordsAsOfLabel}`,
      icon: Calendar,
    },
    {
      href: `/records?state=${encodeURIComponent(stateName)}&show=history`,
      label: `Historial de récords de ${stateName}`,
      icon: History,
    },
    {
      href: `/streaks?state=${encodeURIComponent(stateName)}`,
      label: `Rachas de PRs de ${stateName}`,
      icon: Flame,
    },
    {
      href: `/sor/single?state=${encodeURIComponent(stateName)}`,
      label: `Sum of Ranks de ${stateName}`,
      icon: Plus,
    },
    {
      href: `/sosr/${stateId}/single`,
      label: `Sum of State Ranks de ${stateName}`,
      icon: Plus,
    },
    {
      href: `/kinch/${stateId}`,
      label: `Kinch Ranks de ${stateName}`,
      icon: ChartNoAxesCombined,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Estadísticas</h2>
          <p className="text-sm text-muted-foreground">
            Medallas, gráfica de resoluciones y enlaces de {stateName}
          </p>
        </div>
        {ANNUAL_SUMMARY_ENABLED ? (
          <Link
            href={`/summary/team/${summaryYear}/${stateId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <CalendarRange />
            Resumen anual {summaryYear}
          </Link>
        ) : null}
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Medallas</h3>
        <MedalStrip medals={medals} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <KeyStat label="Podios totales" value={medals.total} />
          <KeyStat label="Récords nacionales" value={totalNationalRecords} />
          <KeyStat
            label="Competencias"
            value={competitionsCount}
            href={`/teams/${stateId}/competitions`}
          />
          {activeYears > 0 ? (
            <KeyStat label="Años activo" value={activeYears} />
          ) : null}
        </div>
      </section>

      <TeamResultsChart stateId={stateId} eventOptions={eventOptions} />

      <Card>
        <CardHeader>
          <CardTitle>Récords nacionales actuales</CardTitle>
        </CardHeader>
        <CardContent>
          <NationalRecordsList records={nationalRecords} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Explorar más</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {exploreLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
